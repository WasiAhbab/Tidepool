import { ConflictException } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid, eventInput, eventEdit } from '../common/validation'
import {
  findInvitation,
  listInvitations,
  listing,
  lockEvent,
  confirmedCount,
  audit,
  notify,
} from './events.repository'
import { promote } from '../waitlist/promote'
import { Injectable } from '@nestjs/common'
const fields = (v: z.infer<typeof eventInput>) => [
  v.title,
  v.category,
  v.description,
  v.venue,
  v.venue_latitude ?? null,
  v.venue_longitude ?? null,
  v.capacity,
  v.starts_at,
  v.ends_at,
  v.state,
]
@Injectable()
export class EventsService {
  constructor(private db: Database) {}
  list(scope?: string) {
    return listInvitations(this.db.pool, scope)
  }
  detail(key: string) {
    return findInvitation(this.db.pool, key)
  }
  async adminList(req: Request) {
    await this.db.session(req, true)
    return (await this.db.pool.query(listing + ' order by starts_at desc')).rows
  }
  async create(req: Request, body: unknown) {
    const staff = await this.db.session(req, true)
    const v = parse(eventInput, body)
    if (Date.parse(v.starts_at) <= Date.now() || !['draft', 'published'].includes(v.state))
      throw new ConflictException('Create a future draft or published event.')
    return this.db.tx(async (c) => {
      const row = (
        await c.query(
          'insert into events(title,category,description,venue,venue_latitude,venue_longitude,capacity,starts_at,ends_at,state) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',
          fields(v),
        )
      ).rows[0]
      await audit(c, staff.committee_id, 'event.created', row.id)
      return row
    })
  }
  async edit(raw: string, req: Request, body: unknown) {
    const id = parse(uuid, raw)
    const staff = await this.db.session(req, true)
    const v = parse(eventEdit, body)
    return this.db.tx(async (c) => {
      const old = await lockEvent(c, id)
      if (old.revision !== v.revision)
        throw new ConflictException(
          'Another committee member updated this event. Close the editor and refresh the workspace before editing again.',
        )
      if (v.state === 'archived')
        throw new ConflictException('Use the archive action after the event ends.')
      if (old.state === 'cancelled' || old.state === 'archived' || old.ends_at <= new Date())
        throw new ConflictException('This event is archived.')
      if (old.state === 'published' && v.state === 'draft')
        throw new ConflictException('A published event can be cancelled or kept public.')
      if (
        v.state !== 'cancelled' &&
        (Date.parse(v.ends_at) <= Date.now() ||
          (Date.parse(v.starts_at) <= Date.now() &&
            new Date(v.starts_at).getTime() !== old.starts_at.getTime()))
      )
        throw new ConflictException('Choose a future event time.')
      if (v.capacity < (await confirmedCount(c, id)))
        throw new ConflictException('Capacity cannot be lower than confirmed attendance.')
      if (v.capacity > old.room_limit && !old.override_reason)
        throw new ConflictException(
          'Capacity exceeds the room limit. Update the room or log an approved override in Admission.',
        )
      const shift = Date.parse(v.starts_at) - old.starts_at.getTime()
      if (
        v.state !== 'cancelled' &&
        (shift !== 0 || Date.parse(v.ends_at) !== old.ends_at.getTime())
      ) {
        const beyond = await c.query(
          "select 1 from agenda_sessions where event_id=$1 and ends_at + $2::double precision * interval '1 millisecond' > $3::timestamptz limit 1",
          [id, shift, v.ends_at],
        )
        if (beyond.rowCount)
          throw new ConflictException(
            'A programme session would end after the event. Shorten it in the programme first.',
          )
        if (shift !== 0) {
          await c.query(
            "update agenda_sessions set starts_at=starts_at+$2::double precision*interval '1 millisecond',ends_at=ends_at+$2::double precision*interval '1 millisecond' where event_id=$1",
            [id, shift],
          )
          await c.query(
            "update events set opens_at=opens_at+$2::double precision*interval '1 millisecond',closes_at=closes_at+$2::double precision*interval '1 millisecond' where id=$1",
            [id, shift],
          )
        }
      }
      const row = (
        await c.query(
          'update events set title=$1,category=$2,description=$3,venue=$4,venue_latitude=$5,venue_longitude=$6,capacity=$7,starts_at=$8,ends_at=$9,state=$10,updated_at=now(),revision=revision+1 where id=$11 returning *',
          [...fields(v), id],
        )
      ).rows[0]
      if (v.state === 'published' && row.starts_at > new Date())
        await promote(c, id, v.title, v.capacity)
      if (
        old.state === 'published' &&
        (v.state === 'cancelled' ||
          old.venue !== v.venue ||
          old.venue_latitude !== (v.venue_latitude ?? null) ||
          old.venue_longitude !== (v.venue_longitude ?? null) ||
          old.starts_at.getTime() !== Date.parse(v.starts_at) ||
          old.ends_at.getTime() !== Date.parse(v.ends_at))
      ) {
        const guests = (
          await c.query(
            "select email from registrations where event_id=$1 and status<>'cancelled'",
            [id],
          )
        ).rows
        for (const guest of guests)
          await notify(
            c,
            guest.email,
            'Update to ' + v.title,
            v.state === 'cancelled'
              ? 'The committee has cancelled ' + v.title + '.'
              : 'The time or venue for ' +
                  v.title +
                  ' has changed. Check your pass for the latest details.',
          )
      }
      await audit(c, staff.committee_id, 'event.updated', id, v.state)
      return row
    })
  }
}
