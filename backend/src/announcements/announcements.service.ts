import { ConflictException } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { audit, lockEvent } from '../events/events.repository'
import { Injectable } from '@nestjs/common'

export const announcement = z.object({
  subject: z.string().trim().min(2).max(140),
  body: z.string().trim().min(3).max(4000),
  audience: z.enum(['all', 'confirmed', 'waitlisted']),
  request_key: uuid,
})
@Injectable()
export class AnnouncementsService {
  constructor(private db: Database) {}
  async list(req: Request, raw: string) {
    await this.db.session(req, true)
    return (
      await this.db.pool.query(
        'select subject,body,audience,created_at from announcements where event_id=$1 order by created_at desc',
        [parse(uuid, raw)],
      )
    ).rows
  }
  async send(req: Request, raw: string, body: unknown) {
    const actor = await this.db.session(req, true),
      id = parse(uuid, raw),
      v = parse(announcement, body)
    await this.db.throttle('announce:' + actor.committee_id, 12, 3600)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id)
      if (e.state === 'draft') throw new ConflictException('Publish the invitation first.')
      const result = await c.query(
        'insert into announcements(event_id,subject,body,audience,request_key) values($1,$2,$3,$4,$5) on conflict do nothing',
        [id, v.subject, v.body, v.audience, v.request_key],
      )
      if (!result.rowCount) return { already: true }
      const sent = await c.query(
        "insert into mail_queue(recipient,subject,body) select email,$2,$3 from registrations where event_id=$1 and status<>'cancelled' and ($4='all' or status=$4) and email not like '%@erased.invalid'",
        [id, e.title + ' · ' + v.subject, v.body, v.audience],
      )
      await audit(c, actor.committee_id, 'announcement.queued', id)
      return { count: sent.rowCount }
    })
  }
}
