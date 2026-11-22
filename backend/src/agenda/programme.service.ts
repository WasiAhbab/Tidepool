import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { audit, lockEvent } from '../events/events.repository'
const name = z.string().trim().min(1).max(120),
  moment = z.string().datetime()
export const programme = z.object({
  revision: z.number().int(),
  tags: z.array(name).max(15),
  speakers: z
    .array(z.object({ name, bio: z.string().max(700), avatar: z.number().int().min(1).max(4) }))
    .max(30),
  sessions: z
    .array(
      z.object({
        title: name,
        starts_at: moment,
        ends_at: moment,
        room: name,
        track: z.string().max(100),
        speaker: z.string().max(120),
      }),
    )
    .max(120),
  questions: z
    .array(
      z.object({
        id: uuid.optional(),
        label: name,
        required: z.boolean(),
        options: z.array(name).max(20),
      }),
    )
    .max(12),
  resources: z.array(z.object({ label: name, url: z.url().regex(/^https:\/\//) })).max(15),
})
@Injectable()
export class ProgrammeService {
  constructor(private db: Database) {}
  async get(id: string) {
    const c = this.db.pool
    const [event, tags, speakers, sessions, questions] = await Promise.all([
      c.query('select * from events where id=$1', [id]),
      c.query('select label from tags where event_id=$1 order by label', [id]),
      c.query('select name,bio,avatar from speakers where event_id=$1 order by name', [id]),
      c.query(
        "select a.title,a.starts_at,a.ends_at,a.room,a.track,coalesce(s.name,'') speaker from agenda_sessions a left join speakers s on s.id=a.speaker_id where a.event_id=$1 order by position",
        [id],
      ),
      c.query(
        'select id,label,required,options from custom_questions where event_id=$1 and active order by position',
        [id],
      ),
    ])
    if (!event.rows[0]) throw new BadRequestException('Unknown event.')
    return {
      event: event.rows[0],
      revision: event.rows[0].revision,
      tags: tags.rows.map((r) => r.label),
      speakers: speakers.rows,
      sessions: sessions.rows,
      questions: questions.rows,
      resources: event.rows[0].resources,
    }
  }
  async save(id: string, actor: string | null, body: unknown) {
    const v = parse(programme, body)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id, v.revision)
      if (e.state === 'archived' || e.state === 'cancelled')
        throw new ConflictException('This event is closed for editing.')
      const people = new Set(v.speakers.map((x) => x.name))
      if (people.size !== v.speakers.length)
        throw new BadRequestException('Speaker names must be distinct.')
      for (const [i, s] of v.sessions.entries()) {
        const start = Date.parse(s.starts_at),
          end = Date.parse(s.ends_at)
        if (start >= end || start < e.starts_at.getTime() || end > e.ends_at.getTime())
          throw new BadRequestException('Sessions must fit within the event dates.')
        if (s.speaker && !people.has(s.speaker))
          throw new BadRequestException('Select a listed speaker.')
        if (
          v.sessions
            .slice(0, i)
            .some(
              (other) =>
                (other.room.toLowerCase() === s.room.toLowerCase() ||
                  (s.speaker && s.speaker === other.speaker)) &&
                start < Date.parse(other.ends_at) &&
                end > Date.parse(other.starts_at),
            )
        )
          throw new BadRequestException('A room or speaker has overlapping sessions.')
      }
      await c.query('delete from agenda_sessions where event_id=$1', [id])
      await c.query('delete from speakers where event_id=$1', [id])
      await c.query('delete from tags where event_id=$1', [id])
      for (const t of new Set(v.tags)) await c.query('insert into tags values($1,$2)', [id, t])
      for (const s of v.speakers)
        await c.query('insert into speakers(event_id,name,bio,avatar) values($1,$2,$3,$4)', [
          id,
          s.name,
          s.bio,
          s.avatar,
        ])
      for (const [i, s] of v.sessions.entries())
        await c.query(
          'insert into agenda_sessions(event_id,title,starts_at,ends_at,room,track,speaker_id,position) values($1,$2,$3,$4,$5,$6,(select id from speakers where event_id=$1 and name=$7),$8)',
          [id, s.title, s.starts_at, s.ends_at, s.room, s.track, s.speaker, i],
        )
      await c.query('update custom_questions set active=false where event_id=$1', [id])
      for (const [i, q] of v.questions.entries()) {
        if (q.id) {
          const r = await c.query(
            'update custom_questions set label=$3,required=$4,options=$5,position=$6,active=true where id=$1 and event_id=$2',
            [q.id, id, q.label, q.required, q.options, i],
          )
          if (!r.rowCount)
            throw new BadRequestException('A question does not belong to this event.')
        } else
          await c.query(
            'insert into custom_questions(event_id,label,required,options,position) values($1,$2,$3,$4,$5)',
            [id, q.label, q.required, q.options, i],
          )
      }
      await c.query('update events set resources=$2,revision=revision+1 where id=$1', [
        id,
        JSON.stringify(v.resources),
      ])
      await audit(c, actor, 'programme.saved', id)
      return { ok: true }
    })
  }
}
