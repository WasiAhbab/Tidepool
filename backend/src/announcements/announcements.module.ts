import { AnnouncementsService } from './announcements.service'
import { Module } from '@nestjs/common'
import { AnnouncementsController } from './announcements.controller'
@Module({ controllers: [AnnouncementsController], providers: [AnnouncementsService] })
export class AnnouncementsModule {}
