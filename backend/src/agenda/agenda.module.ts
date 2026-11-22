import { Module } from '@nestjs/common'
import { AgendaController } from './agenda.controller'
import { ProgrammeService } from './programme.service'
@Module({ controllers: [AgendaController], providers: [ProgrammeService] })
export class AgendaModule {}
