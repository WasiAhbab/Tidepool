import { PassesService } from './passes.service'
import { Module } from '@nestjs/common'
import { PassesController } from './passes.controller'
@Module({ controllers: [PassesController], providers: [PassesService] })
export class PassesModule {}
