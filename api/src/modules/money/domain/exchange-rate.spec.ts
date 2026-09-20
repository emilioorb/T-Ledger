import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { ExchangeRate } from './exchange-rate.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const rate = (value: string, publishedAt: string) =>
  unwrap(ExchangeRate.create({ indicator: '317', value: new Decimal(value), publishedAt: utc(publishedAt) }))

describe('ExchangeRate', () => {
  it('guarda el valor como decimal exacto', () => {
    expect(rate('512.345678', '2026-09-18').value.toString()).toBe('512.345678')
  })

  it('normaliza la publicación al día, sin hora', () => {
    const created = unwrap(
      ExchangeRate.create({
        indicator: '318',
        value: new Decimal('520'),
        publishedAt: new Date('2026-09-18T15:42:11.000Z'),
      }),
    )
    expect(created.publishedAt.toISOString()).toBe('2026-09-18T00:00:00.000Z')
  })

  it('rechaza un valor no positivo', () => {
    expect(isErr(ExchangeRate.create({ indicator: '317', value: new Decimal(0), publishedAt: utc('2026-09-18') }))).toBe(true)
    expect(isErr(ExchangeRate.create({ indicator: '317', value: new Decimal(-1), publishedAt: utc('2026-09-18') }))).toBe(true)
  })

  it('reconoce cuándo está desactualizada', () => {
    const viernes = rate('512', '2026-09-18')
    expect(viernes.isStalerThan(2, utc('2026-09-19'))).toBe(false)
    expect(viernes.isStalerThan(2, utc('2026-09-25'))).toBe(true)
  })
})
