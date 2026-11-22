import { CheckinService } from './checkin.service'
import { Module } from '@nestjs/common'
import { CheckinController } from './checkin.controller'
@Module({ controllers: [CheckinController], providers: [CheckinService] })
export class CheckinModule {}
