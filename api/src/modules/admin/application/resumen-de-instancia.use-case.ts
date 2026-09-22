import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'

export interface ResumenDeInstancia {
  usuarios: number
}

// Los números del servidor entero, no los de un libro. Hoy es uno solo: cuánta gente tiene
// cuenta. Va con el cliente sin filtro porque las cuentas no pertenecen a ningún libro.
@Injectable()
export class ResumenDeInstanciaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ResumenDeInstancia> {
    return { usuarios: await this.prisma.clientSinFiltroDeLibro.authUser.count() }
  }
}
