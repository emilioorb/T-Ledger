import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { InvitacionesALaAppUseCase } from './application/invitaciones-a-la-app.use-case.js'
import { ResumenDeInstanciaUseCase } from './application/resumen-de-instancia.use-case.js'
import { AdminController } from './infrastructure/admin.controller.js'
import { AdminGuard } from './infrastructure/admin.guard.js'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [ResumenDeInstanciaUseCase, InvitacionesALaAppUseCase, AdminGuard],
})
export class AdminModule {}
