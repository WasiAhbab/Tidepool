import { Controller, Get } from '@nestjs/common'
import { Database } from '../database/database'
@Controller('health')
export class HealthController {
  constructor(private db: Database) {}
  @Get('live') live() {
    return { status: 'live' }
  }
  @Get('ready') async ready() {
    await this.db.pool.query('select id from events limit 1')
    return { status: 'ready' }
  }
}
