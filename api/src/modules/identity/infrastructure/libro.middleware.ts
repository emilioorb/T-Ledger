import { ForbiddenException, Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { NextFunction, Request, Response } from 'express'
import { conLibroEnCadena, type Rol } from '../../../shared/libro/libro-context.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { AUTH } from '../identity.tokens.js'
import type { Auth } from './auth.config.js'

// La cabecera que dice en qué libro está parada la pantalla. Cuando no viene, se usa el único
// libro de la persona; si tiene varios, hay que elegir, y elegir por ella sería mostrarle las
// cifras de un libro con el nombre de otro.
export const CABECERA_LIBRO = 'x-libro'

// Middleware y no guard. Un guard devuelve `true` y termina: el contexto que abriera moriría
// ahí y el handler correría afuera, que es el mismo error que hace fallar a `conLibro` cuando
// no se espera el resultado. Un middleware, en cambio, llama a `next()` **adentro** del
// contexto, y `AsyncLocalStorage` lo propaga por toda la cadena que eso dispara.
@Injectable()
export class LibroMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LibroMiddleware.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH) private readonly auth: Auth,
  ) {}

  async use(peticion: Request, _respuesta: Response, seguir: NextFunction) {
    // La sesión se le pide a Better Auth en vez de leerla de la petición. En NestJS el orden
    // es middleware → guards → handler, y quien deja la sesión en la petición es el guard de
    // Better Auth: para cuando corre, este middleware ya pasó. Preguntándole directamente,
    // el orden deja de importar.
    const sesion = await this.auth.api.getSession({ headers: fromNodeHeaders(peticion.headers) })
    const userId = sesion?.user?.id
    // Sin sesión no decide este middleware: el guard de Better Auth responde 401 más adelante.
    if (!userId) return seguir()

    const membresia = await this.membresiaDe(userId, peticion.header(CABECERA_LIBRO))

    // 403 y no 404 cuando el libro no es suyo. Un 404 distinto de un 403 confirmaría que ese
    // libro existe en algún lado, y eso ya es contar de más.
    if (!membresia) return seguir(new ForbiddenException('No tenés acceso a ese libro'))

    conLibroEnCadena(
      { bookId: membresia.organizationId, userId, rol: membresia.role as Rol },
      seguir,
    )
  }

  private async membresiaDe(userId: string, libroPedido: string | undefined) {
    // Sin filtro: las membresías no pertenecen a un libro, lo deciden. Pasarlas por el filtro
    // sería pedirle al portero que muestre la llave antes de entrar.
    const db = this.prisma.clientSinFiltroDeLibro

    if (libroPedido) {
      return db.bookMember.findFirst({ where: { userId, organizationId: libroPedido } })
    }

    const suyas = await db.bookMember.findMany({ where: { userId }, take: 2 })
    if (suyas.length === 1) return suyas[0] ?? null

    if (suyas.length > 1) {
      this.logger.warn(`El usuario ${userId} tiene varios libros y la petición no eligió ninguno`)
    }
    return null
  }
}
