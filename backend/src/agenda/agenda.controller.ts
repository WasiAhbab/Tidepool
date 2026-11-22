import { Controller, Get, Put, Body, Param, Req } from '@nestjs/common'
import type { Request } from 'express'
import { Database } from '../database/database'
import { parse, uuid } from '../common/validation'
import { ProgrammeService } from './programme.service'
@Controller('committee/events/:id/programme')
export class AgendaController {
  constructor(
    private db: Database,
    private service: ProgrammeService,
  ) {}
  @Get() async get(@Req() req: Request, @Param('id') id: string) {
    await this.db.session(req, true)
    return this.service.get(parse(uuid, id))
  }
  @Put() async save(@Req() req: Request, @Param('id') id: string, @Body() v: unknown) {
    const s = await this.db.session(req, true)
    return this.service.save(parse(uuid, id), s.committee_id, v)
  }
}
