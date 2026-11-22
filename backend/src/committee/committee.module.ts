import { RosterService } from './roster.service'
import { AuditService } from '../audit/audit.service'
import { Module } from '@nestjs/common'
import { RosterController } from './roster.controller'
import { AuditController } from '../audit/audit.controller'
@Module({
  controllers: [RosterController, AuditController],
  providers: [RosterService, AuditService],
})
export class CommitteeModule {}
