import { Controller, Get, Header } from '@nestjs/common'
import { Database } from '../database/database'
import { icalendarFeed } from '../contracts/calendar'

@Controller('calendar')
export class CalendarController {
  constructor(private readonly db: Database) {}

  @Get('semester.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  async semester() {
    const { rows } = await this.db.pool.query(
      `select id,title,starts_at,ends_at,description,venue from events
       where state='published' and ends_at>now() order by starts_at,id`,
    )
    return icalendarFeed(rows)
  }
}
