import { saveAttendeeFeedback } from './feedback.repository'
import { ForbiddenException } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { Injectable } from '@nestjs/common'

export const review = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000),
})
@Injectable()
export class FeedbackService {
  constructor(private db: Database) {}
  async send(req: Request, raw: string, body: unknown) {
    const { email } = await this.db.session(req),
      id = parse(uuid, raw),
      v = parse(review, body)
    const r = await saveAttendeeFeedback(this.db.pool, id, email, v.rating, v.comment)
    if (!r.rowCount)
      throw new ForbiddenException('Feedback opens after the event for checked-in guests.')
    return { ok: true }
  }
}
