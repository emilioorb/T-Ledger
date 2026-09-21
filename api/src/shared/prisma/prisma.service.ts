import { AsyncLocalStorage } from 'node:async_hooks'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import type { UnitOfWork } from './unit-of-work.port.js'

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

  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) })
    this.self = this
  }

  // La única puerta por la que los repositorios hablan con la base: dentro de una
  // transacción devuelve su cliente, fuera devuelve el de siempre.
  get client(): Prisma.TransactionClient {
    return this.transaction.getStore() ?? this.self
  }

  // Anidar reusa la transacción de afuera: un caso de uso puede llamar a otro sin que el
  // interno cierre lo que el externo todavía puede tener que revertir.
  async withTransaction<T>(run: () => Promise<T>): Promise<T> {
    if (this.transaction.getStore()) return run()
    return this.self.$transaction((tx) => this.transaction.run(tx, run))
  }

  async onModuleInit(): Promise<void> {
    await this.self.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.self.$disconnect()
  }
}
