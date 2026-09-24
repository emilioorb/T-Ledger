import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { AUTH, LIBRO_BORRADO, type LibroBorrado } from '../identity.tokens.js'
import type { Auth } from '../infrastructure/auth.config.js'
import { asegurarLibroPropio } from '../infrastructure/libro-propio.js'

// Cuando se borra un libro compartido, a quien era su único libro le queda uno propio, vacío.
//
// Después del borrado y sin cortarlo si falla: el libro ya no existe, y hacer fallar el pedido le
// diría a quien lo borró que sigue ahí. Si falla, el middleware del libro se lo abre en su
// próximo pedido; el error queda en el log, con ids y nada más.
@Injectable()
export class LibroPropioAlBorrarse {
  private readonly logger = new Logger(LibroPropioAlBorrarse.name)

  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(LIBRO_BORRADO)
  async manejar({ bookId, miembros }: LibroBorrado): Promise<void> {
    for (const userId of miembros) {
      try {
        if (await asegurarLibroPropio(this.auth, this.prisma.clientSinFiltroDeLibro, userId)) {
          this.logger.log(`El usuario ${userId} se quedó sin libros al borrarse ${bookId}: se le abrió uno propio`)
        }
      } catch (error) {
        this.logger.error(`No se pudo abrir un libro propio para ${userId} tras borrarse ${bookId}`, error)
      }
    }
  }
}
