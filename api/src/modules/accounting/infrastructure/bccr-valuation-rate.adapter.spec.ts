import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { ExchangeRate, RATE_INDICATORS, type RateIndicator } from '../../money/domain/exchange-rate.js'
import type { ExchangeRateRepository } from '../../money/domain/exchange-rate-repository.port.js'
import { rateKey } from '../domain/valuation-rate.port.js'
import { BccrValuationRateAdapter } from './bccr-valuation-rate.adapter.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const rate = (value: string, publishedAt: string) =>
  unwrap(
    ExchangeRate.create({
      indicator: RATE_INDICATORS.BUY,
      value: new Decimal(value),
      publishedAt: utc(publishedAt),
    }),
  )

// El BCCR publica días hábiles: el repositorio real devuelve la última publicación hasta la
// fecha pedida, y el falso replica exactamente esa regla.
const repositoryWith = (published: ExchangeRate[]): ExchangeRateRepository => ({
  findEffectiveAt: async (indicator: RateIndicator, date: Date) =>
    published
      .filter((r) => r.indicator === indicator && r.publishedAt <= date)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0] ?? null,
  findLatest: async () => null,
  findInRange: async () => [],
  saveMany: async () => 0,
})

describe('BccrValuationRateAdapter', () => {
  it('la moneda funcional vale uno todos los días, sin consultar nada', async () => {
    const adapter = new BccrValuationRateAdapter(repositoryWith([]))

    const rates = await adapter.ratesFor([utc('2026-09-19'), utc('2026-09-20')], 'CRC')

    expect(rates.get('2026-09-19')?.toString()).toBe('1')
    expect(rates.get('2026-09-20')?.toString()).toBe('1')
  })

  it('un domingo se valúa con la tasa del viernes', async () => {
    const adapter = new BccrValuationRateAdapter(
      repositoryWith([rate('508', '2026-09-18'), rate('443.27', '2026-09-21')]),
    )

    const rates = await adapter.ratesFor([utc('2026-09-20')], 'USD')

    expect(rates.get('2026-09-20')?.toString()).toBe('508')
  })

  it('una fecha anterior a toda publicación no aparece en el mapa', async () => {
    const adapter = new BccrValuationRateAdapter(repositoryWith([rate('508', '2026-09-18')]))

    const rates = await adapter.ratesFor([utc('2026-09-01'), utc('2026-09-19')], 'USD')

    expect(rates.has('2026-09-01')).toBe(false)
    expect(rates.get('2026-09-19')?.toString()).toBe('508')
  })

  it('una fecha repetida se consulta una sola vez', async () => {
    let calls = 0
    const repository = repositoryWith([rate('508', '2026-09-18')])
    const counting: ExchangeRateRepository = {
      ...repository,
      findEffectiveAt: async (indicator, date) => {
        calls += 1
        return repository.findEffectiveAt(indicator, date)
      },
    }

    await new BccrValuationRateAdapter(counting).ratesFor(
      [utc('2026-09-19'), utc('2026-09-19'), utc('2026-09-19')],
      'USD',
    )

    expect(calls).toBe(1)
  })

  it('la clave del mapa es la fecha en AAAA-MM-DD', () => {
    expect(rateKey(new Date('2026-09-19T18:30:00.000Z'))).toBe('2026-09-19')
  })
})
