import { z } from 'zod'
import { BadRequestException } from '@nestjs/common'
import { createHash, createHmac } from 'node:crypto'
import { config } from '../config/env'
export { uuid, email, categories, eventInput, eventEdit } from '../contracts/events'
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success)
    throw new BadRequestException(
      result.error.issues
        .map((i) => (i.path.length ? i.path.join('.') + ' — ' : '') + i.message)
        .join('. '),
    )
  return result.data
}
export const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export const signature = (value: string) =>
  createHmac('sha256', config.secret).update(value).digest('hex')
export type Role = 'admin' | 'organizer' | 'volunteer'
export type Session = { email: string; committee_id: string | null; role: Role | null }
