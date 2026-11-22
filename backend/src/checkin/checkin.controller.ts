import { Controller, Post, Get, Body, Req, Param, Query } from '@nestjs/common'
import type { Request } from 'express'
import { CheckinService } from './checkin.service'
@Controller()
export class CheckinController {
  constructor(private readonly service: CheckinService) {}
  @Get('check-in/events') events(@Req() req: Request) {
    return this.service.events(req)
  }
  @Get('check-in/:id') find(
    @Req() req: Request,
    @Param('id') raw: string,
    @Query('q') search = '',
  ) {
    return this.service.find(req, raw, search)
  }
  @Post('committee/events/:id/check-in') check(
    @Req() req: Request,
    @Param('id') raw: string,
    @Body() body: unknown,
  ) {
    return this.service.check(req, raw, body)
  }
}
