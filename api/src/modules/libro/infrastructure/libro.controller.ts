import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { z } from 'zod'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import { VerificadorDeContrasena } from '../../identity/infrastructure/verificador-de-contrasena.js'
import { BorrarLibroUseCase } from '../application/borrar-libro.use-case.js'
import { EnlaceDeInvitacionUseCase } from '../application/enlace-de-invitacion.use-case.js'
import { MisLibrosUseCase } from '../application/mis-libros.use-case.js'
import { VaciarLibroUseCase } from '../application/vaciar-libro.use-case.js'
import { totalBorrado } from '../domain/vaciado.js'
import type {
  enlaceDeInvitacionAlLibroResponseSchema,
  libroPropioResponseSchema,
  vaciadoResponseSchema,
} from './libro.responses.js'
import {
  borrarLibroSchema,
  vaciarLibroSchema,
  type BorrarLibroInput,
  type VaciarLibroInput,
} from './libro.schemas.js'

type VaciadoResponse = z.infer<typeof vaciadoResponseSchema>
type LibroPropioResponse = z.infer<typeof libroPropioResponseSchema>
type EnlaceResponse = z.infer<typeof enlaceDeInvitacionAlLibroResponseSchema>

@Controller('book')
export class LibroController {
  constructor(
    private readonly vaciar: VaciarLibroUseCase,
    private readonly libros: MisLibrosUseCase,
    private readonly borrar: BorrarLibroUseCase,
    private readonly contrasena: VerificadorDeContrasena,
    private readonly enlaces: EnlaceDeInvitacionUseCase,
  ) {}

  // Solo quien puede invitar, y solo para una invitación pendiente de este libro.
  @Permiso('invitation', 'create')
  @Post('invitations/:id/link')
  @HttpCode(200)
  async enlace(@Param('id') id: string): Promise<EnlaceResponse> {
    return { token: await this.enlaces.renovar(id) }
  }

  // Sin permiso: cada quien ve los suyos, y el «suyos» sale de la sesión y no de la URL.
  @Get('mine')
  async mine(): Promise<LibroPropioResponse[]> {
    const { userId } = libroActual('ver tus libros')
    const propios = await this.libros.deLaPersona(userId)
    return propios.map((libro) => ({ ...libro, createdAt: libro.createdAt.toISOString() }))
  }

  // `POST` y no `DELETE`: lo que se borra es el contenido, no el recurso de la URL. Un
  // `DELETE /book` diría que el libro deja de existir, y es justo lo que no pasa.
  //
  // 200 con el detalle, no 204: el resumen de lo borrado es la respuesta, y es lo que la
  // pantalla muestra para que el vaciado se pueda comprobar en vez de creer.
  @Permiso('libro', 'vaciar')
  @Post('empty')
  @HttpCode(200)
  async empty(
    @Body(new ZodValidationPipe(vaciarLibroSchema)) input: VaciarLibroInput,
  ): Promise<VaciadoResponse> {
    // El permiso dice que este rol puede vaciar; la contraseña dice que quien está del otro
    // lado es esa persona y no alguien que encontró la sesión abierta. Son dos preguntas
    // distintas y las dos hacen falta antes de borrar una contabilidad entera.
    const { userId } = libroActual('vaciar el libro')
    if (!(await this.contrasena.esLaDe(userId, input.password))) {
      throw new UnauthorizedException('Esa no es tu contraseña.')
    }

    const borrado = await this.vaciar.execute()
    return { borrado, total: totalBorrado(borrado) }
  }

  // Acá sí `DELETE`: el libro deja de existir, para todos los que estaban adentro.
  @Permiso('libro', 'delete')
  @Delete()
  @HttpCode(204)
  async remove(
    @Body(new ZodValidationPipe(borrarLibroSchema)) input: BorrarLibroInput,
  ): Promise<void> {
    const { userId } = libroActual('borrar el libro')
    if (!(await this.contrasena.esLaDe(userId, input.password))) {
      throw new UnauthorizedException('Esa no es tu contraseña.')
    }

    await this.borrar.execute()
  }
}
