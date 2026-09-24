import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { LibroPropio, LibroRepository } from '../domain/libro-repository.port.js'
import { SE_BORRA, type ResumenDeVaciado, type TablaQueSeBorra } from '../domain/vaciado.js'

type Borrado = () => Promise<{ count: number }>

@Injectable()
export class PrismaLibroRepository implements LibroRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Una entrada por tabla y no `client[tabla].deleteMany()`: el acceso por índice produce la
  // unión de las trece firmas de Prisma, que no son compatibles entre sí, y TypeScript la
  // rechaza. Escrito así el compilador exige que estén las trece —lo pide `Record`— y el orden
  // lo sigue mandando `SE_BORRA`, que es la única lista.
  private borradoresDe(): Record<TablaQueSeBorra, Borrado> {
    const cliente = this.prisma.client

    return {
      journalLine: () => cliente.journalLine.deleteMany({}),
      journalEntry: () => cliente.journalEntry.deleteMany({}),
      movement: () => cliente.movement.deleteMany({}),
      accountingPeriod: () => cliente.accountingPeriod.deleteMany({}),
      goalContribution: () => cliente.goalContribution.deleteMany({}),
      goal: () => cliente.goal.deleteMany({}),
      investmentContribution: () => cliente.investmentContribution.deleteMany({}),
      investment: () => cliente.investment.deleteMany({}),
      debtPayment: () => cliente.debtPayment.deleteMany({}),
      debt: () => cliente.debt.deleteMany({}),
      budgetIncome: () => cliente.budgetIncome.deleteMany({}),
      bankLine: () => cliente.bankLine.deleteMany({}),
      bankStatement: () => cliente.bankStatement.deleteMany({}),
    }
  }

  // Con el cliente sin filtro de libro, que es lo correcto acá: la pregunta es justamente a
  // qué libros pertenece alguien, y el filtro la respondería siempre con uno solo.
  async deLaPersona(userId: string): Promise<LibroPropio[]> {
    const membresias = await this.prisma.clientSinFiltroDeLibro.bookMember.findMany({
      where: { userId },
      select: { role: true, book: { select: { id: true, name: true, createdAt: true } } },
    })

    return membresias
      .map(({ role, book }) => ({ id: book.id, name: book.name, role, createdAt: book.createdAt }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async vaciar(): Promise<ResumenDeVaciado> {
    const borradores = this.borradoresDe()
    const resumen: ResumenDeVaciado = {}

    // En serie y en el orden de la lista: las hijas antes que las madres, o la base rechaza
    // el borrado por las claves foráneas. `Promise.all` acá sería más rápido y más frágil.
    //
    // El `where` lo pone la extensión de libro, que agrega `bookId` a cada consulta. Sin
    // contexto de libro tira en vez de borrar: es la misma red que protege a las lecturas, y
    // acá es la que impide que un vaciado se lleve el libro de otra familia.
    for (const tabla of SE_BORRA) {
      const { count } = await borradores[tabla]()
      if (count > 0) resumen[tabla] = count
    }

    return resumen
  }

  // Una sola fila y la cascada del esquema se lleva el resto; `borrado.spec.ts` vigila que
  // cada tabla que cuelga del libro siga cayendo con él. Las sesiones no cuelgan del libro,
  // solo lo nombran, así que se sueltan a mano en la misma transacción: si no, quien lo tenía
  // abierto quedaría parado en un libro que ya no existe.
  async borrar(
    bookId: string,
    userId: string,
    sePuede: (librosDeLaPersona: number) => boolean,
  ): Promise<{ miembros: string[] } | null> {
    return this.prisma.conCandadoDePersona(userId, bookId, async (tx) => {
      if (!sePuede(await tx.bookMember.count({ where: { userId } }))) return null
      const miembros = await tx.bookMember.findMany({ where: { organizationId: bookId }, select: { userId: true } })

      await tx.authSession.updateMany({
        where: { activeOrganizationId: bookId },
        data: { activeOrganizationId: null },
      })
      await tx.book.delete({ where: { id: bookId } })
      return { miembros: miembros.map((miembro) => miembro.userId) }
    })
  }
}
