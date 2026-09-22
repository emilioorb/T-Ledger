import { Body, Controller, Get, HttpCode, Post, UnauthorizedException } from '@nestjs/common'
import { z } from 'zod'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import { VerificadorDeContrasena } from '../../identity/infrastructure/verificador-de-contrasena.js'
import { MisLibrosUseCase } from '../application/mis-libros.use-case.js'
import { VaciarLibroUseCase } from '../application/vaciar-libro.use-case.js'
import { totalBorrado } from '../domain/vaciado.js'
import type { libroPropioResponseSchema, vaciadoResponseSchema } from './libro.responses.js'
import { vaciarLibroSchema, type VaciarLibroInput } from './libro.schemas.js'

type VaciadoResponse = z.infer<typeof vaciadoResponseSchema>
type LibroPropioResponse = z.infer<typeof libroPropioResponseSchema>

@Controller('book')
export class LibroController {
  constructor(
    private readonly vaciar: VaciarLibroUseCase,
    private readonly libros: MisLibrosUseCase,
    private readonly contrasena: VerificadorDeContrasena,
  ) {}

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
}
