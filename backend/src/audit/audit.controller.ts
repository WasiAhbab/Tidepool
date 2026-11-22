import { Controller, Get, Patch, Post, Req, Body, Param } from '@nestjs/common'
import type { Request } from 'express'
import { AuditService } from './audit.service'
@Controller('committee')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get('team') team(@Req() req: Request) {
    return this.service.team(req)
  }
  @Post('team') appoint(@Req() req: Request, @Body() body: unknown) {
    return this.service.appoint(req, body)
  }
  @Patch('team/:id') role(@Req() req: Request, @Param('id') raw: string, @Body() body: unknown) {
    return this.service.role(req, raw, body)
  }
  @Get('audit') logs(@Req() req: Request) {
    return this.service.logs(req)
  }
  @Get('mail') mail(@Req() req: Request) {
    return this.service.mail(req)
  }
  @Post('mail/retry') retry(@Req() req: Request) {
    return this.service.retry(req)
  }
}
