import { ControlsService } from '../committee/controls.service'
import { EventsService } from './events.service'
import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { ControlsController } from '../committee/controls.controller'
@Module({
  controllers: [EventsController, ControlsController],
  providers: [ControlsService, EventsService],
})
export class EventsModule {}
