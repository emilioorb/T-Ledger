import { Decimal } from 'decimal.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { ExchangeRate } from '../domain/exchange-rate.js'
import { PrismaExchangeRateRepository } from './prisma-exchange-rate.repository.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const rate = (value: string, publishedAt: string, indicator: '317' | '318' = '317') =>
  unwrap(ExchangeRate.create({ indicator, value: new Decimal(value), publishedAt: utc(publishedAt) }))

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaExchangeRateRepository

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = new PrismaExchangeRateRepository(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.exchangeRate.deleteMany()
})

describe('PrismaExchangeRateRepository', () => {
  it('guarda varias tasas y conserva el decimal exacto', async () => {
    expect(await repository.saveMany([rate('508.190000', '2026-09-18')])).toBe(1)
    const found = await repository.findLatest('317')
    expect(found?.value.toString()).toBe('508.19')
  })

  it('el backfill es idempotente: guardar dos veces el mismo día no duplica', async () => {
    await repository.saveMany([rate('508.19', '2026-09-18')])
    await repository.saveMany([rate('508.19', '2026-09-18')])
    expect(await prisma.exchangeRate.count()).toBe(1)
  })

  it('una segunda carga del mismo día con otro valor corrige el existente', async () => {
    await repository.saveMany([rate('508.19', '2026-09-18')])
    await repository.saveMany([rate('509.00', '2026-09-18')])
    expect(await prisma.exchangeRate.count()).toBe(1)
    expect((await repository.findLatest('317'))?.value.toString()).toBe('509')
  })

  it('resuelve la tasa vigente cuando la sincronización va atrasada', async () => {
    // El BCCR publica todos los días, pero el job puede no haber corrido todavía:
    // preguntar por hoy tiene que devolver la última tasa que sí trajimos.
    await repository.saveMany([rate('508.02', '2026-09-18')])

    for (const dia of ['2026-09-19', '2026-09-20', '2026-09-21']) {
      const vigente = await repository.findEffectiveAt('317', utc(dia))
      expect(vigente?.publishedAt.toISOString().slice(0, 10)).toBe('2026-09-18')
    }
  })

  it('devuelve null si se pregunta por una fecha anterior a toda publicación', async () => {
    await repository.saveMany([rate('508.02', '2026-09-18')])
    expect(await repository.findEffectiveAt('317', utc('2026-01-01'))).toBeNull()
  })

  it('no mezcla compra con venta', async () => {
    await repository.saveMany([rate('508.02', '2026-09-18', '317'), rate('515.30', '2026-09-18', '318')])
    expect((await repository.findLatest('317'))?.value.toString()).toBe('508.02')
    expect((await repository.findLatest('318'))?.value.toString()).toBe('515.3')
  })

  it('devuelve un rango ordenado por fecha', async () => {
    await repository.saveMany([
      rate('508.45', '2026-09-17'),
      rate('508.19', '2026-09-16'),
      rate('508.02', '2026-09-18'),
    ])
    const range = unwrap(DateRange.create(utc('2026-09-16'), utc('2026-09-17')))
    const found = await repository.findInRange('317', range)

    expect(found.map((r) => r.publishedAt.toISOString().slice(0, 10))).toEqual([
      '2026-09-16',
      '2026-09-17',
    ])
  })
})
