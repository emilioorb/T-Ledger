import { AsyncLocalStorage } from 'node:async_hooks'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import { libroActual } from '../libro/libro-context.js'
import { ChoqueDeTransaccionError, esChoqueDeTransaccion } from './choque-de-transaccion.js'
import { filtroDeLibro } from './libro-filter.extension.js'
import type { UnitOfWork } from './unit-of-work.port.js'

// Tres alcanzan para dos personas escribiendo en el mismo libro; si el choque sigue, algo más
// está pasando y conviene que se vea en vez de insistir.
const INTENTOS_ANTE_UN_CHOQUE = 3

// Varios casos de uso escriben dos veces —el movimiento y su asiento, el aporte y su
// asiento— y si la segunda falla la primera ya está en la base. El cliente transaccional
// viaja por AsyncLocalStorage en vez de pasarse de mano en mano: así los repositorios
// siguen recibiendo un solo `PrismaService` y los casos de uso no conocen Prisma.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, UnitOfWork
{
  private readonly transaction = new AsyncLocalStorage<Prisma.TransactionClient>()

  // `PrismaClient` devuelve un Proxy desde su constructor y sus trampas no reenvían el
  // receptor, así que dentro de un método `this` es el objeto crudo, sin los modelos. Esta
  // referencia guarda el Proxy, que es lo único que sabe resolver `.movement`, `.goal`, etc.
  private readonly self: PrismaClient

  // El cliente con el filtro de libro puesto. Se arma una sola vez: `$extends` devuelve un
  // cliente nuevo en cada llamada, y rearmarlo por consulta desperdicia trabajo en el camino
  // más caliente de la aplicación.
  private readonly filtrado: PrismaClient

  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) })
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
    return this.transaction.getStore() ?? this.filtrado
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
  // de afuera reintenta: la interna vuelve a correr cuando se repite la de afuera entera.
  //
  // Serializable: con dos personas escribiendo a la vez, el libro queda como si hubieran ido
  // una detrás de la otra. Postgres aborta a una de las dos cuando se cruzan, y se reintenta:
  // es seguro porque la función vuelve a leer todo adentro. Agotados los intentos, un error
  // propio que la API responde como «probá de nuevo».
  async withTransaction<T>(run: () => Promise<T>): Promise<T> {
    if (this.transaction.getStore()) return run()
    for (let intento = 1; ; intento += 1) {
      try {
        // La transacción se abre sobre el cliente **filtrado**, no sobre el crudo: el `tx` que
        // entrega Prisma hereda las extensiones del cliente que lo abrió, así que dentro de una
        // transacción el filtro de libro sigue puesto. Abrirla sobre `this.self` dejaría un
        // agujero por el que toda escritura transaccional vería todos los libros.
        return await this.filtrado.$transaction((tx) => this.transaction.run(tx, run), {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        })
      } catch (error) {
        if (!esChoqueDeTransaccion(error)) throw error
        if (intento === INTENTOS_ANTE_UN_CHOQUE) throw new ChoqueDeTransaccionError(error)
      }
    }
  }

  async onModuleInit(): Promise<void> {
    await this.self.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.self.$disconnect()
  }
}
