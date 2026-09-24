import { ESPACIO_DE_LIBROS, ESPACIO_DE_PERSONAS, ESPERA_MAXIMA_DEL_CANDADO } from './candados.js'
import { FilaDeEscrituras } from './fila-de-escrituras.js'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import { libroActual, libroActualSiHay } from '../libro/libro-context.js'
import { ChoqueDeTransaccionError, esChoqueDeTransaccion, esEsperaVencida } from './choque-de-transaccion.js'
import { filtroDeLibro } from './libro-filter.extension.js'
import { transacciones, type Transaccion } from './transaccion-actual.js'
import type { UnitOfWork } from './unit-of-work.port.js'

// Tres alcanzan para un deadlock entre dos personas; si sigue, algo más está pasando y conviene
// que se vea en vez de insistir.
const INTENTOS_ANTE_UN_CHOQUE = 3


// Las conexiones y los tiempos van escritos: los defaults (10 conexiones, 2 s para conseguir una
// y 5 s de transacción) decidían sin que nadie los eligiera cuándo un libro trabado dejaba sin
// servicio a los demás.
const CONEXIONES = 10
const ESPERA_POR_CONEXION_MS = 5_000
const DURACION_MAXIMA_MS = 15_000
// Cuántas escrituras esperan a la vez, antes de pedir conexión: por libro y por persona. Con 10
// conexiones, una sola cuenta ocupa como mucho 4 y quedan 6 para todos los demás.
const EN_FILA_POR_LIBRO = 3
const EN_FILA_POR_PERSONA = 4

interface Opciones {
  esperaMaximaDelCandado?: string
}

// Varios casos de uso escriben dos veces —el movimiento y su asiento, el aporte y su
// asiento— y si la segunda falla la primera ya está en la base. El cliente transaccional
// viaja por AsyncLocalStorage en vez de pasarse de mano en mano: así los repositorios
// siguen recibiendo un solo `PrismaService` y los casos de uso no conocen Prisma.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, UnitOfWork
{
  private readonly transaction = transacciones

  // `PrismaClient` devuelve un Proxy desde su constructor y sus trampas no reenvían el
  // receptor, así que dentro de un método `this` es el objeto crudo, sin los modelos. Esta
  // referencia guarda el Proxy, que es lo único que sabe resolver `.movement`, `.goal`, etc.
  private readonly self: PrismaClient

  // El cliente con el filtro de libro puesto. Se arma una sola vez: `$extends` devuelve un
  // cliente nuevo en cada llamada, y rearmarlo por consulta desperdicia trabajo en el camino
  // más caliente de la aplicación.
  private readonly filtrado: PrismaClient

  private readonly esperaMaximaDelCandado: string

  private readonly fila = new FilaDeEscrituras({ porLibro: EN_FILA_POR_LIBRO, porPersona: EN_FILA_POR_PERSONA })

  constructor(connectionString: string, opciones: Opciones = {}) {
    super({ adapter: new PrismaPg({ connectionString, max: CONEXIONES }) })
    this.esperaMaximaDelCandado = opciones.esperaMaximaDelCandado ?? ESPERA_MAXIMA_DEL_CANDADO
    this.self = this
    this.filtrado = this.self.$extends(filtroDeLibro) as unknown as PrismaClient
  }

  // La única puerta por la que los repositorios hablan con la base: dentro de una
  // transacción devuelve su cliente, fuera devuelve el de siempre.
  //
  // Y por ser la única, es donde va el filtro de libro. Los 14 repositorios no saben que
  // existe: piden `client` como siempre y reciben uno que ya no puede ver otros libros. Si no
  // hay libro en el contexto, la consulta tira en vez de devolver todo.
  get client(): Prisma.TransactionClient {
    return this.transaccionPropia()?.tx ?? this.filtrado
  }

  private transaccionPropia(): Transaccion | undefined {
    const actual = this.transaction.getStore()
    return actual?.abiertaPor === this.filtrado ? actual : undefined
  }

  // El libro de la petición en curso. Los repositorios lo escriben a la vista en cada fila
  // que crean: la pertenencia de un dato tiene que leerse en el código, no ponerla una capa
  // invisible. Tira si no hay libro, igual que todo lo demás.
  get libro(): string {
    return libroActual().bookId
  }

  // Sin el filtro, para lo que legítimamente vive fuera de un libro: Better Auth administrando
  // sus propias tablas y la sincronización de tipos de cambio del BCCR. Se pide a propósito y
  // con nombre feo, para que usarlo sea una decisión visible en la revisión de código.
  get clientSinFiltroDeLibro(): PrismaClient {
    return this.self
  }

  // Anidar reusa la transacción de afuera: un caso de uso puede llamar a otro sin que el
  // interno cierre lo que el externo todavía puede tener que revertir. Por lo mismo, solo la
  // de afuera toma el candado y reintenta.
  //
  // Las escrituras de un libro van en fila: la transacción toma primero el candado de su libro
  // y recién después lee las reglas, así nadie más del libro las cambia en el medio. Los libros
  // distintos no se esperan nunca (ADR-006). Sin libro —la sincronización del tipo de cambio—
  // no hay candado que tomar.
  async withTransaction<T>(run: () => Promise<T>): Promise<T> {
    if (this.transaccionPropia()) return run()
    const contexto = libroActualSiHay()
    const libro = contexto?.bookId
    if (!libro) return this.abrir(run, undefined)

    const salir = this.fila.entrar(libro, contexto.userId)
    if (!salir) throw new ChoqueDeTransaccionError(new Error(`Demasiadas escrituras en fila en el libro ${libro}`))
    try {
      return await this.abrir(run, libro)
    } finally {
      salir()
    }
  }

  private async abrir<T>(run: () => Promise<T>, libro: string | undefined): Promise<T> {
    for (let intento = 1; ; intento += 1) {
      try {
        // La transacción se abre sobre el cliente **filtrado**, no sobre el crudo: el `tx` que
        // entrega Prisma hereda las extensiones del cliente que lo abrió, así que dentro de una
        // transacción el filtro de libro sigue puesto. Abrirla sobre `this.self` dejaría un
        // agujero por el que toda escritura transaccional vería todos los libros.
        return await this.filtrado.$transaction(
          async (tx) => {
            if (libro) await this.tomarCandado(tx, libro)
            // Se espera adentro del contexto: una consulta de Prisma devuelta sin `await` se
            // ejecuta recién cuando alguien la espera, y afuera ya no estaría en la transacción.
            return this.transaction.run({ tx, libro, abiertaPor: this.filtrado }, async () => await run())
          },
          { maxWait: ESPERA_POR_CONEXION_MS, timeout: DURACION_MAXIMA_MS },
        )
      } catch (error) {
        if (esEsperaVencida(error)) throw new ChoqueDeTransaccionError(error)
        if (!esChoqueDeTransaccion(error)) throw error
        if (intento === INTENTOS_ANTE_UN_CHOQUE) throw new ChoqueDeTransaccionError(error)
      }
    }
  }

  // Lo que decide cuántos libros le quedan a alguien no es de ningún libro: va con un candado por
  // persona, sobre el cliente sin filtro, con los mismos tiempos y la misma traducción de errores
  // que el de libro. Toma después el del libro que toca, para que ninguna escritura de ese libro
  // corra a la par: quien tiene el de un libro nunca espera el de una persona, así que no hay ciclo.
  async conCandadoDePersona<T>(
    userId: string,
    libro: string,
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.self.$transaction(
        async (tx) => {
          await this.esperarHasta(tx)
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ESPACIO_DE_PERSONAS}::int, hashtext(${userId}))`
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ESPACIO_DE_LIBROS}::int, hashtext(${libro}))`
          return run(tx)
        },
        { maxWait: ESPERA_POR_CONEXION_MS, timeout: DURACION_MAXIMA_MS },
      )
    } catch (error) {
      if (esEsperaVencida(error) || esChoqueDeTransaccion(error)) throw new ChoqueDeTransaccionError(error)
      throw error
    }
  }

  // De transacción y no de sesión: se suelta solo con el COMMIT o el ROLLBACK, y sobrevive a un
  // PgBouncer en modo transacción. El tope de espera va antes, para que aplique a esta espera.
  private async tomarCandado(tx: Prisma.TransactionClient, libro: string): Promise<void> {
    await this.esperarHasta(tx)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ESPACIO_DE_LIBROS}::int, hashtext(${libro}))`
  }

  // `set_config` con `true` es el `SET LOCAL` parametrizado: vale solo para esta transacción.
  private async esperarHasta(tx: Prisma.TransactionClient): Promise<void> {
    await tx.$executeRaw`SELECT set_config('lock_timeout', ${this.esperaMaximaDelCandado}, true)`
  }

  async onModuleInit(): Promise<void> {
    await this.self.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.self.$disconnect()
  }
}
