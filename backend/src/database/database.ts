import {
  Injectable,
  OnModuleDestroy,
  ForbiddenException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common'
import { Pool, PoolClient } from 'pg'
import { randomBytes } from 'node:crypto'
import type { Request } from 'express'
import { config, runtime } from '../config/env'
import { Session, Role, hash, signature } from '../common/validation'
@Injectable()
export class Database implements OnModuleDestroy {
  pool = new Pool({
    connectionString: config.db,
    max: runtime.DB_POOL_MAX,
    connectionTimeoutMillis: 5000,
    // Keep the single pooled connection alive across normal pauses between clicks.
    // Short idle expiry made Vercel serverless requests repeatedly reconnect to Supabase.
    idleTimeoutMillis: 60000,
    statement_timeout: 12000,
    options: '-c search_path=society,public -c idle_in_transaction_session_timeout=15000',
  })
  constructor() {
    this.pool.on('error', () => console.error('A database connection was interrupted.'))
  }
  async onModuleDestroy() {
    await this.pool.end()
  }
  async tx<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const result = await fn(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async throttle(key: string, max: number, seconds: number) {
    const { rows } = await this.pool.query(
      `insert into rate_limits(key,hits,expires_at) values ($1,1,now()+$2*interval '1 second')
      on conflict(key) do update set hits=case when rate_limits.expires_at<now() then 1 else rate_limits.hits+1 end,
      expires_at=case when rate_limits.expires_at<now() then excluded.expires_at else rate_limits.expires_at end returning hits`,
      [signature(key), seconds],
    )
    if (rows[0].hits > max)
      throw new HttpException('Too many attempts. Please try again later.', 429)
  }
  async session(
    req: Request,
    admin = false,
    roles: Role[] = ['admin', 'organizer'],
  ): Promise<Session> {
    const token = req.cookies?.[admin ? 'tp_committee' : 'tp_guest']
    if (typeof token !== 'string') throw new UnauthorizedException('Sign in to continue.')
    const { rows } = await this.pool.query(
      'select s.email,s.committee_id,c.role from sessions s left join committee c on c.user_id=s.committee_id where digest=$1 and expires_at>now()',
      [hash(token)],
    )
    if (!rows[0]) throw new UnauthorizedException('Your session has expired. Sign in again.')
    if (admin ? !roles.includes(rows[0].role) : rows[0].committee_id !== null)
      throw new ForbiddenException('Your role does not allow this action.')
    return rows[0]
  }
  async issue(client: PoolClient, email: string, committee: string | null) {
    const token = randomBytes(32).toString('base64url')
    const hours = committee ? 8 : 24 * 30
    await client.query("insert into sessions values($1,$2,$3,now()+$4*interval '1 hour')", [
      hash(token),
      email,
      committee,
      hours,
    ])
    return { token, hours }
  }
}
