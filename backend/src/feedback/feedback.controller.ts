import { Controller, Post, Req, Body, Param } from '@nestjs/common'
import type { Request } from 'express'
import { FeedbackService } from './feedback.service'
@Controller('passes/:id/feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}
  @Post() send(@Req() req: Request, @Param('id') raw: string, @Body() body: unknown) {
    return this.service.send(req, raw, body)
  }
}
