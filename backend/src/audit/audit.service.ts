import { ConflictException } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { audit } from '../events/events.repository'
import { Injectable } from '@nestjs/common'

export const appointment = z.object({
  email: z.email().toLowerCase(),
  role: z.enum(['organizer', 'volunteer', 'admin']),
})
export const roleChange = z.object({ role: z.enum(['volunteer', 'organizer', 'admin']) })
@Injectable()
export class AuditService {
  constructor(private db: Database) {}
  async team(req: Request) {
    await this.db.session(req, true, ['admin'])
    return (
      await this.db.pool.query(
        'select c.user_id,c.role,c.appointed_at,(select email from sessions where committee_id=c.user_id order by expires_at desc limit 1) email from committee c order by appointed_at',
      )
    ).rows
  }
  async appoint(req: Request, body: unknown) {
    const a = await this.db.session(req, true, ['admin']),
      v = parse(appointment, body)
    return this.db.tx(async (c) => {
      const id = (
        await c.query('select society.appoint_member($1,$2,$3) id', [
          a.committee_id,
          v.email,
          v.role,
        ])
      ).rows[0].id
      if (!id)
        throw new ConflictException('Create and verify this identity in Supabase Auth first.')
      await audit(c, a.committee_id, 'member.appointed', null, id)
      return { id }
    })
  }
  async role(req: Request, raw: string, body: unknown) {
    const actor = await this.db.session(req, true, ['admin']),
      id = parse(uuid, raw),
      v = parse(roleChange, body)
    if (actor.committee_id === id)
      throw new ConflictException('Ask a second administrator to change your role.')
    return this.db.tx(async (c) => {
      const changed = await c.query('update committee set role=$1 where user_id=$2', [v.role, id])
      if (!changed.rowCount) throw new ConflictException('Membership no longer exists.')
      await audit(c, actor.committee_id, 'member.role_changed', null, id + ' ' + v.role)
      return { ok: true }
    })
  }
  async logs(req: Request) {
    await this.db.session(req, true, ['admin'])
    return (
      await this.db.pool.query(
        'select a.*,e.title from audit_log a left join events e on e.id=a.event_id order by a.id desc limit 300',
      )
    ).rows
  }
  async mail(req: Request) {
    await this.db.session(req, true, ['admin'])
    return (
      await this.db.pool.query(
        'select count(*) filter(where failed_at is null)::int pending,count(*) filter(where failed_at is not null)::int failed from mail_queue',
      )
    ).rows[0]
  }
  async retry(req: Request) {
    const a = await this.db.session(req, true, ['admin'])
    return this.db.tx(async (c) => {
      const res = await c.query(
        'update mail_queue set failed_at=null,attempts=0,next_attempt=now() where failed_at is not null',
      )
      await audit(c, a.committee_id, 'mail.retried', null)
      return { count: res.rowCount }
    })
  }
}
