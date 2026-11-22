import { ConflictException, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid, Role } from '../common/validation'
import { audit, lockEvent } from '../events/events.repository'
import { readTicket } from '../passes/signing'
import { Injectable } from '@nestjs/common'
const door: Role[] = ['volunteer', 'organizer', 'admin']
export const checkIn = z.union([
  z.object({ ticket: z.string().max(300) }).strict(),
  z.object({ registration: uuid, checked: z.boolean() }).strict(),
])
@Injectable()
export class CheckinService {
  constructor(private db: Database) {}
  async events(req: Request) {
    await this.db.session(req, true, door)
    return (
      await this.db.pool.query(
        "select id,title,starts_at from events where state='published' and ends_at>now()-interval '1 day' order by starts_at",
      )
    ).rows
  }
  async find(req: Request, raw: string, search = '') {
    await this.db.session(req, true, door)
    const id = parse(uuid, raw)
    const [rows, total] = await Promise.all([
      this.db.pool.query(
        "select id,name,party_size,checked_in_at from registrations where event_id=$1 and status='confirmed' and (name ilike $2 or email=$3 or left(id::text,8)=$3) order by name,id limit 40",
        [id, '%' + search.trim().slice(0, 100) + '%', search.toLowerCase().trim()],
      ),
      this.db.pool.query(
        "select coalesce(sum(party_size) filter(where checked_in_at is not null),0)::int checked,coalesce(sum(party_size),0)::int total from registrations where event_id=$1 and status='confirmed'",
        [id],
      ),
    ])
    return { rows: rows.rows, ...total.rows[0] }
  }
  async check(req: Request, raw: string, body: unknown) {
    const actor = await this.db.session(req, true, door),
      id = parse(uuid, raw)
    const v = parse(checkIn, body)
    const token = 'ticket' in v ? readTicket(v.ticket, id) : null
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id)
      if (e.state !== 'published') throw new ConflictException('Check-in is closed.')
      const r = (
        await c.query(
          "select * from registrations where event_id=$1 and id=$2 and status='confirmed' for update",
          [id, 'registration' in v ? v.registration : token?.id],
        )
      ).rows[0]
      if (!r || (token && r.pass_nonce !== token.nonce))
        throw new NotFoundException('No active confirmed pass matches.')
      const checked = 'ticket' in v || v.checked
      if (checked && r.checked_in_at)
        return { already: true, checked_in_at: r.checked_in_at, name: r.name }
      const changed = (
        await c.query(
          'update registrations set checked_in_at=case when $2 then now() else null end where id=$1 returning checked_in_at',
          [r.id, checked],
        )
      ).rows[0]
      await audit(c, actor.committee_id, checked ? 'guest.checked_in' : 'guest.check_in_undone', id)
      return { already: false, ...changed, name: r.name }
    })
  }
}
