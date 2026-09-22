import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { ResumenDeInstanciaUseCase } from './application/resumen-de-instancia.use-case.js'
import { AdminController } from './infrastructure/admin.controller.js'
import { AdminGuard } from './infrastructure/admin.guard.js'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [ResumenDeInstanciaUseCase, AdminGuard],
})
export class AdminModule {}
