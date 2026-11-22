import { Controller, Get, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AnalyticsService } from './analytics.service'
@Controller('committee/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get() get(@Req() req: Request) {
    return this.service.get(req)
  }
}
