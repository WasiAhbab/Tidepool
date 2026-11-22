import { Controller, Param, Req, Body, Post } from '@nestjs/common'
import type { Request } from 'express'
import { Database } from '../database/database'
import { RegistrationsService } from './registrations.service'
import { parse, uuid } from '../common/validation'
@Controller('events/:id')
export class RegistrationsController {
  constructor(
    private service: RegistrationsService,
    private db: Database,
  ) {}
  @Post('register') async register(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.service.register(parse(uuid, id), (await this.db.session(req)).email, body)
  }
  @Post('cancel-pass') async cancel(@Param('id') id: string, @Req() req: Request) {
    return this.service.cancel(parse(uuid, id), (await this.db.session(req)).email)
  }
}
