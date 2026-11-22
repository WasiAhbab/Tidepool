import { Controller, Get, Post, Put, Param, Req, Res, Body } from '@nestjs/common'
import type { Request, Response } from 'express'
import { ControlsService } from './controls.service'
@Controller()
export class ControlsController {
  constructor(private readonly service: ControlsService) {}
  @Put('committee/events/:id/settings') save(
    @Req() req: Request,
    @Param('id') raw: string,
    @Body() body: unknown,
  ) {
    return this.service.save(req, raw, body)
  }
  @Post('committee/events/:id/archive') archive(
    @Req() req: Request,
    @Param('id') raw: string,
    @Body() body: unknown,
  ) {
    return this.service.archive(req, raw, body)
  }
  @Post('committee/events/:id/duplicate') duplicate(@Req() req: Request, @Param('id') raw: string) {
    return this.service.duplicate(req, raw)
  }
  @Post('committee/covers') upload(@Req() req: Request, @Body() body: unknown) {
    return this.service.upload(req, body)
  }
  @Get('covers/:id') cover(@Param('id') raw: string, @Res() res: Response) {
    return this.service.cover(raw, res)
  }
}
