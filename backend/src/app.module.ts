import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module'
import { EventsModule } from './events/events.module'
import { RegistrationsModule } from './registrations/registrations.module'
import { AgendaModule } from './agenda/agenda.module'
import { CommitteeModule } from './committee/committee.module'
import { CheckinModule } from './checkin/checkin.module'
import { PassesModule } from './passes/passes.module'
import { FeedbackModule } from './feedback/feedback.module'
import { AnnouncementsModule } from './announcements/announcements.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { HealthModule } from './health/health.module'
import { CalendarModule } from './calendar/calendar.module'
import { MaintenanceController } from './mail/maintenance.controller'
@Module({
  controllers: [MaintenanceController],
  imports: [
    DatabaseModule,
    AuthModule,
    EventsModule,
    RegistrationsModule,
    AgendaModule,
    CommitteeModule,
    CheckinModule,
    PassesModule,
    FeedbackModule,
    AnnouncementsModule,
    AnalyticsModule,
    HealthModule,
    CalendarModule,
  ],
})
export class AppModule {}
