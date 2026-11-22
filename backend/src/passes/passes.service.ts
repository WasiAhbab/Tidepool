import type { Request } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, hash } from '../common/validation'
import { readCancellation, ticket } from './signing'
import { lockEvent, notify } from '../events/events.repository'
import { release } from '../registrations/registrations.service'
import { ConflictException, Injectable } from '@nestjs/common'
import { promote } from '../waitlist/promote'
export const cancelLink = z.object({ token: z.string().trim().min(1).max(256) }).strict()

export const erasure = z.object({ confirm: z.literal('DELETE') })
@Injectable()
export class PassesService {
  constructor(private db: Database) {}
  async list(req: Request) {
    const { email } = await this.db.session(req)
    const { rows } = await this.db.pool.query(
      `select r.id,r.name,r.status,r.party_size,r.checked_in_at,r.pass_nonce,(to_jsonb(e)-'override_reason') event,
 case when r.status='waitlisted' then (select count(*)::int from registrations x where x.event_id=e.id and x.status='waitlisted' and (x.registered_at,x.id)<=(r.registered_at,r.id)) end position,
 (select rating from feedback f where f.registration_id=r.id) rating from registrations r join events e on e.id=r.event_id where r.email=$1 and r.status<>'cancelled' order by e.starts_at desc`,
      [email],
    )
    return {
      email,
      passes: rows.map(({ pass_nonce, ...r }) => ({
        ...r,
        qr:
          r.status === 'confirmed' && r.event.state === 'published'
            ? ticket(r.id, r.event.id, pass_nonce)
            : null,
      })),
    }
  }
  async data(req: Request) {
    const { email } = await this.db.session(req)
    return {
      email,
      profile:
        (
          await this.db.pool.query(
            'select name,university,academic_level,subject,study_period,phone,updated_at from attendee_profiles where email=$1',
            [email],
          )
        ).rows[0] || null,
      registrations: (
        await this.db.pool.query(
          `select e.title,r.name,r.status,r.party_size,r.registered_at,r.checked_in_at,r.consent_at,r.listed,(select jsonb_object_agg(q.label,a.value) from answers a join custom_questions q on q.id=a.question_id where a.registration_id=r.id) answers,(select jsonb_build_object('rating',f.rating,'comment',f.comment) from feedback f where f.registration_id=r.id) feedback from registrations r join events e on e.id=r.event_id where r.email=$1`,
          [email],
        )
      ).rows,
    }
  }
  async previewCancellation(req: Request, body: unknown) {
    await this.db.throttle('cancel-link:' + (req.ip || 'unknown'), 120, 60)
    const { token } = parse(cancelLink, body),
      claim = readCancellation(token),
      row = (
        await this.db.pool.query(
          `select r.pass_nonce,r.status,r.checked_in_at,e.title,e.starts_at,e.venue,e.timezone,e.state
           from registrations r join events e on e.id=r.event_id
           where r.id=$1 and e.id=$2`,
          [claim.id, claim.event],
        )
      ).rows[0]
    if (
      !row ||
      row.pass_nonce !== claim.nonce ||
      row.status === 'cancelled' ||
      row.checked_in_at ||
      row.state !== 'published' ||
      new Date(row.starts_at) <= new Date()
    )
      throw new ConflictException('This pass is no longer cancellable.')
    return {
      title: row.title,
      starts_at: row.starts_at,
      venue: row.venue,
      timezone: row.timezone,
      status: row.status,
    }
  }
  async cancelByLink(req: Request, body: unknown) {
    await this.db.throttle('cancel-link:' + (req.ip || 'unknown'), 120, 60)
    const { token } = parse(cancelLink, body),
      claim = readCancellation(token)
    return this.db.tx(async (c) => {
      const event = await lockEvent(c, claim.event)
      if (event.state !== 'published' || event.starts_at <= new Date())
        throw new ConflictException('This event has already started or is no longer published.')
      const row = (
        await c.query(
          `select id,email,pass_nonce,status,checked_in_at from registrations
           where id=$1 and event_id=$2 for update`,
          [claim.id, claim.event],
        )
      ).rows[0]
      if (!row || row.pass_nonce !== claim.nonce || row.status === 'cancelled' || row.checked_in_at)
        throw new ConflictException('This pass is no longer cancellable.')
      await c.query(
        "update registrations set status='cancelled',listed=false,pass_nonce=gen_random_uuid() where id=$1",
        [claim.id],
      )
      await promote(c, event.id, event.title, event.capacity)
      await notify(
        c,
        row.email,
        event.title + ' registration cancelled',
        'Your place was released.',
      )
      return { ok: true }
    })
  }
  async erase(req: Request, body: unknown) {
    const { email } = await this.db.session(req)
    parse(erasure, body)
    return this.db.tx(async (c) => {
      const events = (
        await c.query(
          'select distinct event_id from registrations where email=$1 order by event_id',
          [email],
        )
      ).rows
      for (const { event_id: id } of events) {
        const e = await lockEvent(c, id)
        if (
          e.starts_at > new Date() &&
          (
            await c.query(
              "select 1 from registrations where email=$1 and event_id=$2 and status<>'cancelled' and checked_in_at is null",
              [email, id],
            )
          ).rowCount
        )
          await release(c, e, email)
      }
      await c.query(
        'delete from answers where registration_id in(select id from registrations where email=$1)',
        [email],
      )
      await c.query(
        'delete from feedback where registration_id in(select id from registrations where email=$1)',
        [email],
      )
      await c.query(
        "update registrations set email=id::text||'@erased.invalid',identity_key=null,name='Deleted attendee',listed=false,request_key=null,pass_nonce=gen_random_uuid() where email=$1",
        [email],
      )
      await c.query('delete from attendee_profiles where email=$1', [email])
      await c.query('delete from command_receipts where actor_key=$1', [hash(email)])
      for (const sql of [
        'delete from sessions where committee_id is null and email=$1',
        'delete from challenges where email=$1',
        'delete from mail_queue where recipient=$1',
      ])
        await c.query(sql, [email])
      return { ok: true }
    })
  }
}
