import { ForbiddenException, Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { NextFunction, Request, Response } from 'express'
import { conLibroEnCadena, type Rol } from '../../../shared/libro/libro-context.js'
import { elegirLibro } from './elegir-libro.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { AUTH } from '../identity.tokens.js'
import type { Auth } from './auth.config.js'

// La cabecera que dice en qué libro está parada la pantalla. Cuando no viene, manda el libro
// activo de la sesión; y si tampoco hay, el único que tenga. Elegir por ella cuando tiene
// varios sería mostrarle las cifras de un libro con el nombre de otro.
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

    const membresia = await this.membresiaDe(
      userId,
      peticion.header(CABECERA_LIBRO),
      sesion.session.activeOrganizationId,
    )

    // 403 y no 404 cuando el libro no es suyo. Un 404 distinto de un 403 confirmaría que ese
    // libro existe en algún lado, y eso ya es contar de más.
    if (!membresia) return seguir(new ForbiddenException('No tenés acceso a ese libro'))

    conLibroEnCadena(
      { bookId: membresia.organizationId, userId, rol: membresia.role as Rol },
      seguir,
    )
  }

  private async membresiaDe(
    userId: string,
    libroPedido: string | undefined,
    libroActivo: string | null | undefined,
  ) {
    // Sin filtro: las membresías no pertenecen a un libro, lo deciden. Pasarlas por el filtro
    // sería pedirle al portero que muestre la llave antes de entrar.
    //
    // Se traen todas y se elige en memoria: son dos o tres filas por persona, y con la
    // decisión en una función pura se puede probar sin base.
    const suyas = await this.prisma.clientSinFiltroDeLibro.bookMember.findMany({
      where: { userId },
      select: { organizationId: true, role: true },
    })

    const elegida = elegirLibro({ pedido: libroPedido, activo: libroActivo, suyas })

    if (!elegida && suyas.length > 1) {
      this.logger.warn(`El usuario ${userId} tiene varios libros y la petición no eligió ninguno`)
    }
    return elegida
  }
}
