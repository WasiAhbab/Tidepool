import { Controller, Post, Req, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { Database } from '../database/database'
import { runtime } from '../config/env'
import { maintain } from './jobs'
import { deliverQueuedMail } from './worker'

@Controller('internal/maintenance')
export class MaintenanceController {
  constructor(private readonly db: Database) {}

  @Post()
  async run(@Req() req: Request) {
    const supplied = Buffer.from(req.headers.authorization || ''),
      expected = Buffer.from('Bearer ' + (runtime.CRON_SECRET || ''))
    if (
      !runtime.CRON_SECRET ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      throw new UnauthorizedException()

    await maintain(this.db)
    const delivered = await deliverQueuedMail(this.db, 10)
    return { ok: true, delivered }
  }
}
