import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { Database } from '../database/database'
import { config } from '../config/env'
import { cookie } from './cookie'
import { email, hash, parse, signature, uuid } from '../common/validation'
import { transport } from '../mail/transport'
import { log } from '../common/errors'
import { Injectable } from '@nestjs/common'

export const codeRequest = z.object({ email })
export const verification = z.object({ id: uuid, code: z.string().regex(/^\d{6}$/) })
export const credentials = z.object({ email, password: z.string().min(1).max(256) })
export const signOut = z.object({ role: z.enum(['guest', 'committee']) })
@Injectable()
export class AuthService {
  constructor(private db: Database) {}
  async challenge(body: unknown, req: Request) {
    const address = parse(codeRequest, body).email
    await this.db.throttle('mail-ip:' + req.ip, 1800, 600)
    await this.db.throttle('mail:' + address, 4, 600)
    const id = randomUUID(),
      code = String(randomInt(1000000)).padStart(6, '0')
    await this.db.pool.query(
      "insert into challenges(id,email,digest,expires_at) values($1,$2,$3,now()+interval '10 minutes')",
      [id, address, signature(id + code)],
    )
    try {
      await transport.sendMail({
        from: config.from,
        to: address,
        subject: 'Your Tidepool sign-in code',
        text:
          'Your Tidepool code is ' +
          code +
          '. It expires in 10 minutes. If you did not request it, you can ignore this message.',
      })
    } catch (error) {
      const mailError = error as { code?: unknown; command?: unknown; responseCode?: unknown }
      log.error(
        {
          provider: process.env.SMTP_HOST,
          code: mailError.code,
          command: mailError.command,
          responseCode: mailError.responseCode,
        },
        'Verification email delivery failed',
      )
      await this.db.pool.query('delete from challenges where id=$1', [id])
      throw new ServiceUnavailableException('Email delivery is unavailable. Please try again.')
    }
    return { id }
  }
  async verify(body: unknown, res: Response, req: Request) {
    const { id, code } = parse(verification, body)
    const issued = await this.db.tx(async (c) => {
      const row = (
        await c.query(
          'select * from challenges where id=$1 and expires_at>now() and attempts<5 for update',
          [id],
        )
      ).rows[0]
      if (!row) return null
      if (!timingSafeEqual(Buffer.from(row.digest), Buffer.from(signature(id + code)))) {
        await c.query('update challenges set attempts=attempts+1 where id=$1', [id])
        return null
      }
      await c.query('delete from challenges where id=$1', [id])
      await c.query('delete from sessions where digest=$1 and committee_id is null', [
        hash(req.cookies.tp_guest || ''),
      ])
      return this.db.issue(c, row.email, null)
    })
    if (!issued) throw new UnauthorizedException('That code is incorrect or expired.')
    cookie(res, 'tp_guest', issued.token, issued.hours * 3600000)
    return { ok: true }
  }
  async login(body: unknown, req: Request, res: Response) {
    const input = parse(credentials, body)
    await this.db.throttle('staff-ip:' + req.ip, 40, 600)
    await this.db.throttle('staff:' + input.email, 10, 600)
    const auth = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await auth.auth.signInWithPassword(input)
    if (error || !data.user) throw new UnauthorizedException('Email or password is incorrect.')
    const member = (
      await this.db.pool.query('select user_id from committee where user_id=$1', [data.user.id])
    ).rows[0]
    if (!member) throw new ForbiddenException('Committee membership is required.')
    const issued = await this.db.tx(async (c) => {
      await c.query('delete from sessions where digest=$1 and committee_id is not null', [
        hash(req.cookies.tp_committee || ''),
      ])
      await c.query("insert into audit_log(actor,action) values($1,'committee.signed_in')", [
        member.user_id,
      ])
      return this.db.issue(c, input.email, member.user_id)
    })
    await auth.auth.signOut({ scope: 'local' })
    cookie(res, 'tp_committee', issued.token, issued.hours * 3600000)
    return { ok: true }
  }
  async current(req: Request) {
    const optional = async (committee: boolean) => {
      if (!req.cookies[committee ? 'tp_committee' : 'tp_guest']) return null
      try {
        return await this.db.session(req, committee, ['admin', 'organizer', 'volunteer'])
      } catch (e) {
        if (e instanceof UnauthorizedException || e instanceof ForbiddenException) return null
        throw e
      }
    }
    const [guest, staff] = await Promise.all([optional(false), optional(true)])
    return { guest: !!guest, staff }
  }
  async staff(req: Request) {
    return this.db.session(req, true, ['admin', 'organizer', 'volunteer'])
  }
  async me(req: Request) {
    return { email: (await this.db.session(req)).email }
  }
  async profile(req: Request) {
    const { email: address } = await this.db.session(req)
    return (
      (
        await this.db.pool.query(
          'select name,university,academic_level,subject,study_period,phone from attendee_profiles where email=$1',
          [address],
        )
      ).rows[0] || null
    )
  }
  async logout(body: unknown, req: Request, res: Response) {
    const { role } = parse(signOut, body)
    const key = role === 'guest' ? 'tp_guest' : 'tp_committee'
    await this.db.pool.query('delete from sessions where digest=$1', [hash(req.cookies[key] || '')])
    cookie(res, key, '', 0)
    return { ok: true }
  }
}
