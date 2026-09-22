import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import type { z } from 'zod'
import { ResumenDeInstanciaUseCase } from '../application/resumen-de-instancia.use-case.js'
import { AdminGuard } from './admin.guard.js'
import type {
  resumenDeInstanciaResponseSchema,
  soyAdminResponseSchema,
} from './admin.responses.js'

type SoyAdmin = z.infer<typeof soyAdminResponseSchema>
type Resumen = z.infer<typeof resumenDeInstanciaResponseSchema>

@Controller('admin')
export class AdminController {
  constructor(
    private readonly resumen: ResumenDeInstanciaUseCase,
    private readonly guard: AdminGuard,
  ) {}

  // Contesta a todos, con la verdad. Existe para que el menú sepa si mostrar la entrada sin
  // tener que pedir datos que le van a dar 403 y ensuciar la consola de quien no es admin.
  @Get('me')
  async soy(@Req() peticion: Request): Promise<SoyAdmin> {
    return { admin: await this.guard.loEs(peticion) }
  }

  @UseGuards(AdminGuard)
  @Get('summary')
  async summary(): Promise<Resumen> {
    return this.resumen.execute()
  }
}
