import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { ListarRastroUseCase } from './application/listar-rastro.use-case.js'
import { AuditoriaController } from './infrastructure/auditoria.controller.js'

// La lectura del registro: un endpoint y su consulta. La escritura vive en `RastroModule`,
// que es lo que importan los módulos de dominio.
@Module({
  imports: [PrismaModule],
  controllers: [AuditoriaController],
  providers: [ListarRastroUseCase],
})
export class AuditoriaModule {}
