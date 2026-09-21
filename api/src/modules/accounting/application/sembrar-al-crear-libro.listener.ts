import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { conLibro } from '../../../shared/libro/libro-context.js'
import { LIBRO_CREADO, type LibroCreado } from '../../identity/identity.tokens.js'
import { SeedChartUseCase } from './seed-chart.use-case.js'

// Un libro sin plan de cuentas no sirve para nada: no se puede anotar un solo movimiento. Esto
// es lo que hace que crear un libro entregue algo usable en vez de una base vacía que la
// persona tiene que llenar sin saber por dónde empezar.
//
// La dependencia va en este sentido a propósito: contabilidad sabe que existen los libros,
// identidad no sabe que existe un plan de cuentas. Al revés, el módulo que maneja sesiones
// tendría que conocer el dominio contable entero.
@Injectable()
export class SembrarAlCrearLibro {
  private readonly logger = new Logger(SembrarAlCrearLibro.name)

  constructor(private readonly semilla: SeedChartUseCase) {}

  @OnEvent(LIBRO_CREADO)
  async manejar({ bookId }: LibroCreado): Promise<void> {
    // El evento llega fuera de toda petición, así que abre su propio contexto: el plan que se
    // va a sembrar es del libro recién creado y de ningún otro. `owner` porque quien acaba de
    // crear un libro es su dueño.
    await conLibro({ bookId, userId: 'sistema', rol: 'owner' }, async () => {
      const cuentas = await this.semilla.execute()
      this.logger.log(`Libro ${bookId} nace con ${cuentas} cuentas`)
    })
  }
}
