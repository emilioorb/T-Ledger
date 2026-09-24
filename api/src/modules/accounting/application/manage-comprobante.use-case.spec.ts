import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Almacenamiento, ArchivoNuevo } from '../../../shared/archivos/almacenamiento.port.js'
import { EditadoPorOtroError } from '../../../shared/http/api-error.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { transaccionActual } from '../../../shared/prisma/transaccion-actual.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { PrismaRastroRepository } from '../../auditoria/infrastructure/prisma-rastro.repository.js'
import { Movement } from '../domain/movement.js'
import { PrismaMovementRepository } from '../infrastructure/prisma-movement.repository.js'
import { ManageComprobanteUseCase } from './manage-comprobante.use-case.js'

// Un bucket en memoria que puede frenar una subida a mitad de camino, para meter otra escritura
// justo ahí.
class BucketDePrueba implements Almacenamiento {
  readonly claves = new Set<string>()
  subioDentroDeUnaTransaccion = false
  private frenada: Promise<void> | null = null
  private alLlegar: () => void = () => {}

  frenarLaProxima(): { soltar: () => void; llego: Promise<void> } {
    let soltar: () => void = () => {}
    let avisar: () => void = () => {}
    this.frenada = new Promise<void>((listo) => (soltar = listo))
    const llego = new Promise<void>((listo) => (avisar = listo))
    this.alLlegar = avisar
    return { soltar, llego }
  }

  async guardar({ clave }: ArchivoNuevo): Promise<void> {
    this.subioDentroDeUnaTransaccion ||= transaccionActual() !== undefined
    this.alLlegar()
    if (this.frenada) await this.frenada
    this.frenada = null
    this.claves.add(clave)
  }

  async enlaceDeLectura(clave: string): Promise<string> {
    return clave
  }

  async borrar(clave: string): Promise<void> {
    this.claves.delete(clave)
  }

  async borrarTodoBajo(): Promise<void> {}
}

let postgres: RunningPostgres
let prisma: PrismaService
let movements: PrismaMovementRepository
let bucket: BucketDePrueba
let comprobantes: ManageComprobanteUseCase

const archivo = { contenido: Buffer.from('%PDF-1.4'), tipo: 'application/pdf' }

const guardado = () =>
  prisma.withTransaction(async () => {
    const movement = unwrap(
      Movement.create({
        id: '00000000-0000-7000-8000-000000000001',
        date: new Date('2026-09-16T00:00:00.000Z'),
        kind: 'EXPENSE',
        categoryId: 'cat-1',
        counterparty: 'Proveedor',
        amount: Money.fromMinorUnits(20_000_00n, 'CRC'),
        paymentAccountCode: '1101',
        receiptKey: null,
        status: 'ACTIVE',
        version: 0,
      }),
    )
    await movements.add(movement)
    return movement
  })

beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  movements = new PrismaMovementRepository(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.auditLog.deleteMany()
  await prisma.movement.deleteMany()
  bucket = new BucketDePrueba()
  comprobantes = new ManageComprobanteUseCase(movements, bucket, prisma, new PrismaRastroRepository(prisma))
})

describe('el comprobante de un movimiento', () => {
  it('anularlo mientras se sube el comprobante no lo vuelve a activo', async () => {
    const movement = await guardado()
    const { soltar, llego } = bucket.frenarLaProxima()

    const subida = comprobantes.guardar(movement.id, archivo)
    await llego
    await prisma.withTransaction(() => movements.update(movement.void_()))
    soltar()
    const resultado = await subida

    expect(resultado.status).toBe('VOIDED')
    expect((await movements.findById(movement.id))?.status).toBe('VOIDED')
    expect((await movements.findById(movement.id))?.receiptKey).toBe(resultado.receiptKey)
  })

  it('con una versión vieja no apunta el comprobante y borra el archivo que subió', async () => {
    const movement = await guardado()
    await comprobantes.guardar(movement.id, archivo, 0)
    const [primero] = bucket.claves

    await expect(comprobantes.guardar(movement.id, archivo, 0)).rejects.toBeInstanceOf(EditadoPorOtroError)

    expect([...bucket.claves]).toEqual([primero])
    expect((await movements.findById(movement.id))?.receiptKey).toBe(primero)
  })

  it('reemplazarlo borra el anterior una vez guardado el nuevo', async () => {
    const movement = await guardado()
    await comprobantes.guardar(movement.id, archivo)
    const reemplazado = await comprobantes.guardar(movement.id, archivo)

    expect([...bucket.claves]).toEqual([reemplazado.receiptKey])
  })

  it('quitarlo con una versión vieja no lo quita', async () => {
    const movement = await guardado()
    const conComprobante = await comprobantes.guardar(movement.id, archivo)

    await expect(comprobantes.quitar(movement.id, movement.version)).rejects.toBeInstanceOf(EditadoPorOtroError)
    await comprobantes.quitar(movement.id, conComprobante.version)

    expect((await movements.findById(movement.id))?.receiptKey).toBeNull()
    expect(bucket.claves.size).toBe(0)
  })

  it('el archivo se sube afuera de la transacción: no retiene el candado del libro esperando la red', async () => {
    const movement = await guardado()

    await comprobantes.guardar(movement.id, archivo)

    expect(bucket.subioDentroDeUnaTransaccion).toBe(false)
  })
})
