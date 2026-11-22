import { receipt, record } from '../common/receipt'
import { BadRequestException, ConflictException } from '@nestjs/common'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { audit, lockEvent, confirmedCount, notify } from '../events/events.repository'
import { promote } from '../waitlist/promote'
import { csvCell } from '../contracts/csv'
import { Injectable } from '@nestjs/common'

export const rosterAction = z.object({
  ids: z.array(uuid).min(1).max(300),
  action: z.enum(['cancel', 'promote', 'resend', 'message']),
  message: z.string().trim().max(2000).optional(),
  request_key: uuid,
})
@Injectable()
export class RosterService {
  constructor(private db: Database) {}
  async roster(req: Request, raw: string) {
    await this.db.session(req, true)
    return (
      await this.db.pool.query(
        `select r.id,r.name,r.email,r.status,r.registered_at,r.checked_in_at,r.party_size,
          p.university,p.academic_level,p.subject,p.study_period,p.phone,
          (select jsonb_object_agg(q.label,a.value) from answers a join custom_questions q on q.id=a.question_id where a.registration_id=r.id) answers
         from registrations r left join attendee_profiles p on p.email=r.email
         where r.event_id=$1 and r.status<>'cancelled' order by r.registered_at,r.id`,
        [parse(uuid, raw)],
      )
    ).rows
  }
  async exp(req: Request, id: string, res: Response, format?: string) {
    const rows = await this.roster(req, id)
    const qs = [...new Set(rows.flatMap((r) => Object.keys(r.answers || {})))]
    const values = [
      [
        'Name',
        'Email',
        'University',
        'Study level',
        'Subject',
        'Semester or class',
        'Phone',
        'Status',
        'Party',
        'Registered',
        'Checked in',
        ...qs,
      ],
      ...rows.map((r) => [
        r.name,
        r.email,
        r.university || '',
        r.academic_level || '',
        r.subject || '',
        r.study_period || '',
        r.phone || '',
        r.status,
        r.party_size,
        r.registered_at,
        r.checked_in_at,
        ...qs.map((q) => r.answers?.[q] || ''),
      ]),
    ]
    if (format === 'xlsx') {
      const { Workbook } = await import('exceljs')
      const book = new Workbook()
      book.addWorksheet('Roster').addRows(values)
      res.attachment('attendees-' + id + '.xlsx').send(Buffer.from(await book.xlsx.writeBuffer()))
      return
    }
    res
      .attachment('attendees-' + id + '.csv')
      .send('\uFEFF' + values.map((row) => row.map(csvCell).join(',')).join('\r\n'))
  }
  async bulk(req: Request, raw: string, body: unknown) {
    const actor = await this.db.session(req, true),
      id = parse(uuid, raw),
      v = parse(rosterAction, body)
    if (v.action === 'message' && !v.message)
      throw new BadRequestException('Write a message first.')
    await this.db.throttle('bulk:' + actor.committee_id, 30, 600)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id)
      const replay = await receipt(c, id, v.request_key, actor.email, v.action)
      if (replay) return replay
      const rows = (
        await c.query(
          "select * from registrations where event_id=$1 and id=any($2::uuid[]) and status<>'cancelled' order by registered_at,id",
          [id, v.ids],
        )
      ).rows
      if (rows.length !== new Set(v.ids).size)
        throw new ConflictException('The roster changed. Refresh it and select the guests again.')
      if (v.action === 'promote') {
        if (e.state !== 'published' || e.starts_at <= new Date())
          throw new ConflictException('Registration is closed.')
        const line = (
          await c.query(
            "select id from registrations where event_id=$1 and status='waitlisted' order by registered_at,id limit $2",
            [id, rows.length],
          )
        ).rows
        if (
          line.some((r, i) => rows[i].id !== r.id) ||
          rows.some((r) => r.status !== 'waitlisted') ||
          (await confirmedCount(c, id)) + rows.reduce((n, r) => n + r.party_size, 0) > e.capacity
        )
          throw new ConflictException('Promotion must fit the room and follow waitlist order.')
        await promote(c, id, e.title, e.capacity)
      } else if (v.action === 'cancel') {
        if (rows.some((r) => r.checked_in_at))
          throw new ConflictException('Undo check-in before cancelling an attendee.')
        await c.query(
          "update registrations set status='cancelled',listed=false,pass_nonce=gen_random_uuid() where id=any($1::uuid[])",
          [v.ids],
        )
        if (e.state === 'published' && e.starts_at > new Date())
          await promote(c, id, e.title, e.capacity)
        for (const r of rows)
          await notify(
            c,
            r.email,
            e.title + ' registration cancelled',
            'The committee cancelled your place.',
          )
      } else {
        for (const r of rows)
          await notify(c, r.email, e.title, v.message || 'Use My passes to retrieve your ticket.')
      }
      await audit(c, actor.committee_id, 'roster.' + v.action, id, rows.length + ' guests')
      return record(c, id, v.request_key, actor.email, v.action, { count: rows.length })
    })
  }
}
