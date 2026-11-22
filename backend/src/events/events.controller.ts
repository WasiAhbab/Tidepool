import { Body, Controller, Get, Param, Patch, Post, Req, Query } from '@nestjs/common'
import type { Request } from 'express'
import { EventsService } from './events.service'
@Controller()
export class EventsController {
  constructor(private readonly service: EventsService) {}
  @Get('events') list(@Query('scope') scope?: string) {
    return this.service.list(scope)
  }
  @Get('events/:id') detail(@Param('id') key: string) {
    return this.service.detail(key)
  }
  @Get('committee/events') adminList(@Req() req: Request) {
    return this.service.adminList(req)
  }
  @Post('committee/events') create(@Req() req: Request, @Body() body: unknown) {
    return this.service.create(req, body)
  }
  @Patch('committee/events/:id') edit(
    @Param('id') raw: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.service.edit(raw, req, body)
  }
}
