import { attendanceReport } from './analytics.repository'
import type { Request } from 'express'
import { Database } from '../database/database'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AnalyticsService {
  constructor(private db: Database) {}
  async get(req: Request) {
    await this.db.session(req, true)
    return attendanceReport(this.db.pool)
  }
}
