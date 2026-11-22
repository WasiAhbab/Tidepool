import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import type { Request, Response } from 'express'
import { z } from 'zod'
import sharp from 'sharp'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { audit, lockEvent } from '../events/events.repository'
import { Injectable } from '@nestjs/common'
export const settings = z
  .object({
    revision: z.number().int(),
    room_limit: z.number().int().min(1).max(10000),
    override_reason: z.string().trim().max(240),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v })
        return true
      } catch {
        return false
      }
    }),
    email_domain: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+)?$/)
      .max(200),
    opens_at: z.string().datetime().nullable(),
    closes_at: z.string().datetime().nullable(),
    plus_one: z.boolean(),
    waitlist_enabled: z.boolean(),
    cover: z
      .string()
      .regex(
        /^(?:\/art\/(?:workshop|social|talk|hackathon)(?:-[23])?\.webp|\/api\/v1\/covers\/[0-9a-f-]{36})$/,
      )
      .nullable(),
  })
  .strict()
export const archiveRequest = z.object({ revision: z.number().int() })
export const coverUpload = z.object({ data: z.string().min(10).max(1400000) })
@Injectable()
export class ControlsService {
  constructor(private db: Database) {}
  async save(req: Request, raw: string, body: unknown) {
    const actor = await this.db.session(req, true),
      v = parse(settings, body),
      id = parse(uuid, raw)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id, v.revision)
      if (['archived', 'cancelled'].includes(e.state))
        throw new ConflictException('This event is closed.')
      if (v.room_limit < e.capacity && v.override_reason.length < 8)
        throw new BadRequestException(
          'Explain the approved room override or lower registration capacity.',
        )
      if (
        (v.opens_at && Date.parse(v.opens_at) >= e.starts_at.getTime()) ||
        (v.closes_at && Date.parse(v.closes_at) > e.starts_at.getTime()) ||
        (v.opens_at && v.closes_at && v.opens_at >= v.closes_at)
      )
        throw new BadRequestException(
          'Choose a registration window ending by the start of the event.',
        )
      await c.query(
        'update events set room_limit=$2,override_reason=$3,timezone=$4,email_domain=$5,opens_at=$6,closes_at=$7,plus_one=$8,waitlist_enabled=$9,cover=$10,revision=revision+1 where id=$1',
        [
          id,
          v.room_limit,
          v.override_reason,
          v.timezone,
          v.email_domain || null,
          v.opens_at,
          v.closes_at,
          v.plus_one,
          v.waitlist_enabled,
          v.cover,
        ],
      )
      await audit(c, actor.committee_id, 'settings.updated', id, v.override_reason)
      return { ok: true }
    })
  }
  async archive(req: Request, raw: string, body: unknown) {
    const actor = await this.db.session(req, true),
      id = parse(uuid, raw),
      v = parse(archiveRequest, body)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id, v.revision)
      if (e.ends_at > new Date() || e.state !== 'published')
        throw new ConflictException('Only completed published events can be archived.')
      await c.query("update events set state='archived',revision=revision+1 where id=$1", [id])
      await audit(c, actor.committee_id, 'event.archived', id)
      return { ok: true }
    })
  }
  async duplicate(req: Request, raw: string) {
    const actor = await this.db.session(req, true),
      id = parse(uuid, raw)
    return this.db.tx(async (c) => {
      const e = await lockEvent(c, id)
      const out = (
        await c.query(
          `insert into events(title,category,venue,venue_latitude,venue_longitude,description,capacity,state,starts_at,ends_at,room_limit,override_reason,timezone,cover,resources,email_domain,plus_one,waitlist_enabled)
 select left(title,80)||' (copy)',category,venue,venue_latitude,venue_longitude,description,capacity,'draft',starts_at+interval '7 days',ends_at+interval '7 days',room_limit,override_reason,timezone,cover,resources,email_domain,plus_one,waitlist_enabled from events where id=$1 returning id`,
          [e.id],
        )
      ).rows[0]
      await c.query('insert into tags select $2,label from tags where event_id=$1', [id, out.id])
      await c.query(
        'insert into custom_questions(event_id,label,required,options,position) select $2,label,required,options,position from custom_questions where event_id=$1 and active',
        [id, out.id],
      )
      await c.query(
        'insert into speakers(event_id,name,bio,avatar) select $2,name,bio,avatar from speakers where event_id=$1',
        [id, out.id],
      )
      await c.query(
        `insert into agenda_sessions(event_id,title,starts_at,ends_at,room,track,speaker_id,position) select $2,a.title,a.starts_at+interval '7 days',a.ends_at+interval '7 days',a.room,a.track,n.id,a.position from agenda_sessions a left join speakers s on s.id=a.speaker_id left join speakers n on n.event_id=$2 and n.name=s.name where a.event_id=$1`,
        [id, out.id],
      )
      await audit(c, actor.committee_id, 'event.duplicated', out.id)
      return out
    })
  }
  async upload(req: Request, body: unknown) {
    await this.db.session(req, true)
    const { data } = parse(coverUpload, body)
    const b = Buffer.from(data, 'base64')
    let image: Buffer
    try {
      const s = sharp(b, { limitInputPixels: 18000000 })
      const m = await s.metadata()
      if (!['jpeg', 'png', 'webp', 'avif'].includes(m.format || '')) throw Error()
      image = await s
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    } catch {
      throw new BadRequestException('Choose a valid JPEG, PNG, WebP or AVIF image under 1 MB.')
    }
    const r = (
      await this.db.pool.query('insert into covers(image) values($1) returning id', [image])
    ).rows[0]
    return { url: '/api/v1/covers/' + r.id }
  }
  async cover(raw: string, res: Response) {
    const r = (await this.db.pool.query('select image from covers where id=$1', [parse(uuid, raw)]))
      .rows[0]
    if (!r) throw new NotFoundException()
    res.setHeader('Cache-Control', 'public,max-age=31536000,immutable')
    res.type('webp').send(r.image)
  }
}
