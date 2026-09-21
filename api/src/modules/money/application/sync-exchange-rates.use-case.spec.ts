import { Decimal } from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import type { ExchangeRateProviderPort } from '../domain/exchange-rate-provider.port.js'
import type { ExchangeRateRepository } from '../domain/exchange-rate-repository.port.js'
import { ExchangeRate } from '../domain/exchange-rate.js'
import { SyncExchangeRatesUseCase } from './sync-exchange-rates.use-case.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const HOY = utc('2026-09-18')

const rate = (publishedAt: string) =>
  unwrap(
    ExchangeRate.create({
      indicator: '317',
      value: new Decimal('508'),
      publishedAt: utc(publishedAt),
    }),
  )

const repositoryStub = (latest: ExchangeRate | null): ExchangeRateRepository => ({
  findEffectiveAt: vi.fn(),
  findPublishedUpTo: vi.fn().mockResolvedValue([]),
  findLatest: vi.fn().mockResolvedValue(latest),
  findInRange: vi.fn(),
  saveMany: vi.fn().mockResolvedValue(3),
})

const providerStub = (rates: ExchangeRate[]): ExchangeRateProviderPort => ({
  fetchRates: vi.fn().mockResolvedValue(rates),
})

describe('SyncExchangeRatesUseCase', () => {
  it('pide solo el hueco entre la última tasa guardada y hoy, en una sola llamada', async () => {
    const provider = providerStub([rate('2026-09-16'), rate('2026-09-17'), rate('2026-09-18')])
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(rate('2026-09-15')))

    const report = await useCase.execute(HOY)

    expect(provider.fetchRates).toHaveBeenCalledTimes(1)
    expect(report.from.toISOString().slice(0, 10)).toBe('2026-09-16')
    expect(report.to.toISOString().slice(0, 10)).toBe('2026-09-18')
    expect(report.failed).toBe(false)
  })

  it('sin ninguna tasa guardada, arranca el backfill desde un año atrás', async () => {
    const provider = providerStub([rate('2026-09-18')])
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(null))

    const report = await useCase.execute(HOY)

    expect(report.from.toISOString().slice(0, 10)).toBe('2025-09-18')
  })

  it('no llama al BCCR si ya está al día', async () => {
    const provider = providerStub([])
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(rate('2026-09-18')))

    const report = await useCase.execute(HOY)

    expect(provider.fetchRates).not.toHaveBeenCalled()
    expect(report.saved).toBe(0)
  })

  it('si el BCCR falla, reporta el fallo y no lanza: la aplicación sigue andando', async () => {
    const provider: ExchangeRateProviderPort = {
      fetchRates: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
    }
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(rate('2026-09-15')))

    const report = await useCase.execute(HOY)

    expect(report.failed).toBe(true)
    expect(report.reason).toContain('ETIMEDOUT')
    expect(report.saved).toBe(0)
  })
})
