import { AsyncLocalStorage } from 'node:async_hooks'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import { libroActual, libroActualSiHay } from '../libro/libro-context.js'
import { ChoqueDeTransaccionError, esChoqueDeTransaccion, esEsperaVencida } from './choque-de-transaccion.js'
import { filtroDeLibro } from './libro-filter.extension.js'
import type { UnitOfWork } from './unit-of-work.port.js'

// Tres alcanzan para un deadlock entre dos personas; si sigue, algo más está pasando y conviene
// que se vea en vez de insistir.
const INTENTOS_ANTE_UN_CHOQUE = 3

// El espacio de claves de los candados de libros, para no compartirlo con otros usos de los
// advisory locks (Prisma migrate usa el suyo).
const ESPACIO_DE_LIBROS = 624

// Cuánto espera una escritura a que termine la de otra persona en el mismo libro. Más que eso es
// una cola, no una espera: se corta y se pide probar de nuevo, antes de que ocupe todo el pool.
const ESPERA_MAXIMA_DEL_CANDADO = '4s'

// Las conexiones y los tiempos van escritos: los defaults (10 conexiones, 2 s para conseguir una
// y 5 s de transacción) decidían sin que nadie los eligiera cuándo un libro trabado dejaba sin
// servicio a los demás.
const CONEXIONES = 10
const ESPERA_POR_CONEXION_MS = 5_000
const DURACION_MAXIMA_MS = 15_000

interface Transaccion {
  tx: Prisma.TransactionClient
  // El libro cuyo candado tiene esta transacción; ninguno si no es de un libro.
  libro: string | undefined
}

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
  private readonly transaction = new AsyncLocalStorage<Transaccion>()

  // `PrismaClient` devuelve un Proxy desde su constructor y sus trampas no reenvían el
  // receptor, así que dentro de un método `this` es el objeto crudo, sin los modelos. Esta
  // referencia guarda el Proxy, que es lo único que sabe resolver `.movement`, `.goal`, etc.
  private readonly self: PrismaClient

  // El cliente con el filtro de libro puesto. Se arma una sola vez: `$extends` devuelve un
  // cliente nuevo en cada llamada, y rearmarlo por consulta desperdicia trabajo en el camino
  // más caliente de la aplicación.
  private readonly filtrado: PrismaClient

  private readonly esperaMaximaDelCandado: string

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
    return this.transaction.getStore()?.tx ?? this.filtrado
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
    if (this.transaction.getStore()) return run()
    const libro = libroActualSiHay()?.bookId
    for (let intento = 1; ; intento += 1) {
      try {
        // La transacción se abre sobre el cliente **filtrado**, no sobre el crudo: el `tx` que
        // entrega Prisma hereda las extensiones del cliente que lo abrió, así que dentro de una
        // transacción el filtro de libro sigue puesto. Abrirla sobre `this.self` dejaría un
        // agujero por el que toda escritura transaccional vería todos los libros.
        return await this.filtrado.$transaction(
          async (tx) => {
            if (libro) await this.tomarCandado(tx, libro)
            return this.transaction.run({ tx, libro }, run)
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

  // De transacción y no de sesión: se suelta solo con el COMMIT o el ROLLBACK, y sobrevive a un
  // PgBouncer en modo transacción. El tope de espera va antes, para que aplique a esta espera.
  private async tomarCandado(tx: Prisma.TransactionClient, libro: string): Promise<void> {
    // `set_config` con `true` es el `SET LOCAL` parametrizado: vale solo para esta transacción.
    await tx.$executeRaw`SELECT set_config('lock_timeout', ${this.esperaMaximaDelCandado}, true)`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ESPACIO_DE_LIBROS}::int, hashtext(${libro}))`
  }

  async onModuleInit(): Promise<void> {
    await this.self.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.self.$disconnect()
  }
}
