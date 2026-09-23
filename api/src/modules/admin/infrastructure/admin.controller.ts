import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import type { z } from 'zod'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import {
  InvitacionesALaAppUseCase,
  type InvitacionALaApp,
} from '../application/invitaciones-a-la-app.use-case.js'
import { ResumenDeInstanciaUseCase } from '../application/resumen-de-instancia.use-case.js'
import { AdminGuard } from './admin.guard.js'
import { invitarALaAppSchema } from './admin.responses.js'
import type {
  invitacionALaAppResponseSchema,
  resumenDeInstanciaResponseSchema,
  soyAdminResponseSchema,
} from './admin.responses.js'

type SoyAdmin = z.infer<typeof soyAdminResponseSchema>
type Resumen = z.infer<typeof resumenDeInstanciaResponseSchema>
type InvitacionResponse = z.infer<typeof invitacionALaAppResponseSchema>
type InvitarInput = z.infer<typeof invitarALaAppSchema>

const presentar = ({ id, email, expiresAt }: InvitacionALaApp): InvitacionResponse => ({
  id,
  email,
  expiresAt: expiresAt.toISOString(),
})

@Controller('admin')
export class AdminController {
  constructor(
    private readonly resumen: ResumenDeInstanciaUseCase,
    private readonly guard: AdminGuard,
    private readonly invitaciones: InvitacionesALaAppUseCase,
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

  // Sin `@Permiso`: no es algo de un libro sino de la instancia, y lo decide `AdminGuard`.
  @UseGuards(AdminGuard)
  @Post('invitations')
  async invitar(
    @Body(new ZodValidationPipe(invitarALaAppSchema)) input: InvitarInput,
  ): Promise<InvitacionResponse> {
    const { userId } = libroActual('invitar a la app')
    return presentar(await this.invitaciones.invitar(input.email, userId))
  }

  @UseGuards(AdminGuard)
  @Get('invitations')
  async pendientes(): Promise<InvitacionResponse[]> {
    return (await this.invitaciones.pendientes()).map(presentar)
  }

  @UseGuards(AdminGuard)
  @Delete('invitations/:id')
  @HttpCode(204)
  async cancelar(@Param('id') id: string): Promise<void> {
    await this.invitaciones.cancelar(id)
  }
}
