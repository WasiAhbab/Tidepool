import { canSeat, mailboxIdentity } from '../contracts/admission'
import { receipt, record } from '../common/receipt'
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import type { PoolClient } from 'pg'
import { Database } from '../database/database'
import { confirmedCount, lockEvent, notify } from '../events/events.repository'
import { promote } from '../waitlist/promote'
import { parse } from '../common/validation'
import { admission } from '../contracts/events'
export async function release(
  c: PoolClient,
  event: { id: string; title: string; state: string; starts_at: Date; capacity: number },
  email: string,
) {
  const result = await c.query(
    "update registrations set status='cancelled',listed=false,pass_nonce=gen_random_uuid() where event_id=$1 and email=$2 and status<>'cancelled' and checked_in_at is null returning id",
    [event.id, email],
  )
  if (!result.rowCount) throw new ConflictException('There is no cancellable pass.')
  if (event.state === 'published' && event.starts_at > new Date())
    await promote(c, event.id, event.title, event.capacity)
}
@Injectable()
export class RegistrationsService {
  constructor(private db: Database) {}
  async register(id: string, email: string, input: unknown) {
    const v = parse(admission, input)
    await this.db.throttle('rsvp:' + email, 80, 600)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id),
        now = new Date()
      const replay = await receipt(c, id, v.request_key, email, 'rsvp')
      if (replay) {
        const current = (
          await c.query(
            'select id,status,request_key from registrations where id=$1 and event_id=$2 and email=$3',
            [replay.id, id, email],
          )
        ).rows[0]
        if (!current || current.status === 'cancelled' || current.request_key !== v.request_key)
          throw new ConflictException(
            'This request belongs to an earlier registration. Open a fresh registration to join again.',
          )
        return { id: current.id, status: current.status }
      }
      const domain = email.split('@')[1]
      // Only Gmail guarantees that plus aliases refer to the same mailbox across all its users.
      const identity = mailboxIdentity(email)
      const prior = (
        await c.query(
          'select id,status,email,request_key from registrations where event_id=$1 and (email=$2 or identity_key=$3) order by registered_at desc limit 1',
          [id, email, identity],
        )
      ).rows[0]
      if (prior && prior.status !== 'cancelled') {
        if (prior.email !== email)
          throw new ConflictException(
            'An alias of this mailbox already holds a place. Open My passes with the original address.',
          )
        return { id: prior.id, status: prior.status }
      }
      if (prior?.request_key && prior.request_key === v.request_key)
        throw new ConflictException(
          'This registration was cancelled. Open a fresh registration to join again.',
        )
      if (
        e.state !== 'published' ||
        e.starts_at <= now ||
        e.opens_at > now ||
        (e.closes_at && e.closes_at <= now)
      )
        throw new ConflictException('Registration is closed.')
      if (e.email_domain && e.email_domain !== domain)
        throw new BadRequestException('Use an email address ending in @' + e.email_domain + '.')
      if (v.companion && !e.plus_one)
        throw new BadRequestException('This event allows one place per registration.')
      const size = v.companion ? 2 : 1
      if (size > e.capacity)
        throw new BadRequestException('This party is larger than the room capacity.')
      const questions = (
        await c.query(
          'select * from custom_questions where event_id=$1 and active order by position',
          [id],
        )
      ).rows
      if (Object.keys(v.answers).some((key) => !questions.some((q) => q.id === key)))
        throw new BadRequestException('The questions changed. Reload this invitation.')
      for (const q of questions) {
        const a = v.answers[q.id]
        if ((q.required && !a) || (a && q.options.length && !q.options.includes(a)))
          throw new BadRequestException('Please check your answer to ' + q.label + '.')
      }
      const queued = (
        await c.query(
          "select 1 from registrations where event_id=$1 and status='waitlisted' limit 1",
          [id],
        )
      ).rowCount
      const full = !canSeat(e.capacity, await confirmedCount(c, id), size, !!queued)
      if (full && (!e.waitlist_enabled || !v.waitlist))
        throw new ConflictException(
          e.waitlist_enabled
            ? 'Your party needs the waitlist. Review availability and join the queue.'
            : 'This event is full.',
        )
      if (v.profile)
        await c.query(
          `insert into attendee_profiles(email,name,university,academic_level,subject,study_period,phone)
           values($1,$2,$3,$4,$5,$6,$7)
           on conflict(email) do update set name=excluded.name,university=excluded.university,
             academic_level=excluded.academic_level,subject=excluded.subject,
             study_period=excluded.study_period,phone=excluded.phone,updated_at=now()`,
          [
            email,
            v.name,
            v.profile.university,
            v.profile.academic_level,
            v.profile.subject,
            v.profile.study_period,
            v.profile.phone,
          ],
        )
      const result = (
        await c.query(
          `insert into registrations(event_id,email,name,status,party_size,listed,consent_at,identity_key,request_key) values($1,$2,$3,$4,$5,$6,now(),$7,$8)
 on conflict(event_id,email) do update set name=excluded.name,status=excluded.status,party_size=excluded.party_size,listed=excluded.listed,consent_at=now(),identity_key=excluded.identity_key,request_key=excluded.request_key,registered_at=clock_timestamp(),checked_in_at=null,pass_nonce=gen_random_uuid() returning id,status`,
          [
            id,
            email,
            v.name,
            full ? 'waitlisted' : 'confirmed',
            size,
            v.listed,
            identity,
            v.request_key ?? null,
          ],
        )
      ).rows[0]
      await c.query('delete from answers where registration_id=$1', [result.id])
      for (const [key, value] of Object.entries(v.answers))
        if (value) await c.query('insert into answers values($1,$2,$3)', [result.id, key, value])
      await notify(
        c,
        email,
        e.title + ' — ' + result.status,
        'Your registration for ' + e.title + ' is ' + result.status + '.',
      )
      return record(c, id, v.request_key, email, 'rsvp', result)
    })
  }
  async cancel(id: string, email: string) {
    return this.db.tx(async (c) => {
      const event = await lockEvent(c, id)
      if (event.starts_at <= new Date()) throw new ConflictException('This event has started.')
      await release(c, event, email)
      return { ok: true }
    })
  }
}
