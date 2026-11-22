import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { PassesService } from './passes.service'
@Controller('passes')
export class PassesController {
  constructor(private readonly service: PassesService) {}
  @Get() list(@Req() req: Request) {
    return this.service.list(req)
  }
  @Get('data') data(@Req() req: Request) {
    return this.service.data(req)
  }
  @Post('cancel-link/preview') previewCancellation(@Req() req: Request, @Body() body: unknown) {
    return this.service.previewCancellation(req, body)
  }
  @Post('cancel-link') cancelByLink(@Req() req: Request, @Body() body: unknown) {
    return this.service.cancelByLink(req, body)
  }
  @Post('erase') erase(@Req() req: Request, @Body() body: unknown) {
    return this.service.erase(req, body)
  }
}
