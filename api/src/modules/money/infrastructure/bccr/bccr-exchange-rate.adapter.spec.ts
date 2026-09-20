import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DateRange } from '../../../../shared/kernel/date-range.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import type { RateIndicator } from '../../domain/exchange-rate.js'
import type { BccrApiClient } from './bccr-api.client.js'
import { BccrExchangeRateAdapter } from './bccr-exchange-rate.adapter.js'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../test/fixtures/bccr/${name}`, import.meta.url), 'utf8'))

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const rango = unwrap(DateRange.create(utc('2026-09-14'), utc('2026-09-19')))

const clienteDoble = (pedidos: RateIndicator[] = []) =>
  ({
    fetchSeries: async (indicator: RateIndicator) => {
      pedidos.push(indicator)
      return fixture(indicator === '317' ? 'series-compra.json' : 'series-venta.json')
    },
  }) as unknown as BccrApiClient

describe('BccrExchangeRateAdapter', () => {
  it('trae compra y venta en una sola llamada al puerto', async () => {
    const pedidos: RateIndicator[] = []
    const rates = await new BccrExchangeRateAdapter(clienteDoble(pedidos)).fetchRates(rango)

    expect(pedidos).toEqual(['317', '318'])
    expect(rates).toHaveLength(12)
    expect(rates.filter((r) => r.indicator === '317')).toHaveLength(6)
    expect(rates.filter((r) => r.indicator === '318')).toHaveLength(6)
  })

  it('devuelve tasas del dominio, no la forma del BCCR', async () => {
    const rates = await new BccrExchangeRateAdapter(clienteDoble()).fetchRates(rango)
    const venta = rates.find((r) => r.indicator === '318' && r.publishedAt.getTime() === utc('2026-09-19').getTime())

    expect(venta?.value.toString()).toBe('449.24')
  })
})
