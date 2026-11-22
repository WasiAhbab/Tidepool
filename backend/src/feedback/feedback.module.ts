import { FeedbackService } from './feedback.service'
import { Module } from '@nestjs/common'
import { FeedbackController } from './feedback.controller'
@Module({ controllers: [FeedbackController], providers: [FeedbackService] })
export class FeedbackModule {}
