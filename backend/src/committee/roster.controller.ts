import { Controller, Get, Post, Req, Res, Body, Param, Query } from '@nestjs/common'
import type { Request, Response } from 'express'
import { RosterService } from './roster.service'
@Controller('committee/events/:id')
export class RosterController {
  constructor(private readonly service: RosterService) {}
  @Get('roster') roster(@Req() req: Request, @Param('id') raw: string) {
    return this.service.roster(req, raw)
  }
  @Get('export') exp(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    return this.service.exp(req, id, res, format)
  }
  @Post('bulk') bulk(@Req() req: Request, @Param('id') raw: string, @Body() body: unknown) {
    return this.service.bulk(req, raw, body)
  }
}
