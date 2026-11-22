import { Controller, Get, Post, Req, Param, Body } from '@nestjs/common'
import type { Request } from 'express'
import { AnnouncementsService } from './announcements.service'
@Controller('committee/events/:id/announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}
  @Get() list(@Req() req: Request, @Param('id') raw: string) {
    return this.service.list(req, raw)
  }
  @Post() send(@Req() req: Request, @Param('id') raw: string, @Body() body: unknown) {
    return this.service.send(req, raw, body)
  }
}
