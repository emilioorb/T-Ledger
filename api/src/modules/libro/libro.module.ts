import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { RastroModule } from '../auditoria/rastro.module.js'
import { BorrarLibroUseCase } from './application/borrar-libro.use-case.js'
import { MisLibrosUseCase } from './application/mis-libros.use-case.js'
import { VaciarLibroUseCase } from './application/vaciar-libro.use-case.js'
import { LIBRO_REPOSITORY } from './domain/libro-repository.port.js'
import { LibroController } from './infrastructure/libro.controller.js'
import { PrismaLibroRepository } from './infrastructure/prisma-libro.repository.js'

@Module({
  imports: [PrismaModule, RastroModule],
  controllers: [LibroController],
  providers: [
    { provide: LIBRO_REPOSITORY, useClass: PrismaLibroRepository },
    VaciarLibroUseCase,
    MisLibrosUseCase,
    BorrarLibroUseCase,
  ],
})
export class LibroModule {}
