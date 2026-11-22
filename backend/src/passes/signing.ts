import { BadRequestException } from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'
import { signature, uuid } from '../common/validation'
import { z } from 'zod'
export function ticket(id: string, event: string, nonce: string) {
  const body = [id, event, nonce].join('.')
  return body + '.' + signature('pass:' + body)
}
export function readTicket(value: string, event: string) {
  const [id, bound, nonce, mac, ...rest] = value.split('.')
  if (
    rest.length ||
    bound !== event ||
    !uuid.safeParse(id).success ||
    !uuid.safeParse(nonce).success ||
    !mac ||
    !/^[a-f0-9]{64}$/.test(mac) ||
    !timingSafeEqual(Buffer.from(ticket(id, bound, nonce).split('.')[3]), Buffer.from(mac))
  )
    throw new BadRequestException('This pass is invalid for this event.')
  return { id, nonce }
}

export function cancellation(id: string, event: string, nonce: string, startsAt: Date | string) {
  const expires = Math.floor(new Date(startsAt).getTime() / 1000),
    body = [id, event, nonce, expires].join('.')
  return body + '.' + signature('cancel:' + body)
}

export function readCancellation(value: string) {
  const parts = z.string().max(256).safeParse(value)
  if (!parts.success) throw new BadRequestException('This cancellation link is invalid.')
  const [id, event, nonce, rawExpires, mac, ...rest] = parts.data.split('.'),
    expires = Number(rawExpires),
    body = [id, event, nonce, rawExpires].join('.')
  if (
    rest.length ||
    !uuid.safeParse(id).success ||
    !uuid.safeParse(event).success ||
    !uuid.safeParse(nonce).success ||
    !/^\d{10}$/.test(rawExpires || '') ||
    !Number.isSafeInteger(expires) ||
    !mac ||
    !/^[a-f0-9]{64}$/.test(mac) ||
    !timingSafeEqual(Buffer.from(signature('cancel:' + body)), Buffer.from(mac))
  )
    throw new BadRequestException('This cancellation link is invalid.')
  if (expires <= Math.floor(Date.now() / 1000))
    throw new BadRequestException('This cancellation link has expired.')
  return { id, event, nonce, expires }
}
