import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BccrEmptyResponseError, parseBccrResponse } from './bccr-response.schema.js'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../test/fixtures/bccr/${name}`, import.meta.url), 'utf8'))

describe('parseBccrResponse', () => {
  it('convierte la serie de venta en tasas del dominio', () => {
    const rates = parseBccrResponse(fixture('series-venta.json'), '318')
    expect(rates).toHaveLength(6)
    expect(rates[0]?.publishedAt.toISOString()).toBe('2026-09-14T00:00:00.000Z')
    expect(rates[0]?.value.toString()).toBe('449.94')
    expect(rates[0]?.indicator).toBe('318')
  })

  it('conserva el valor sin pasar por el doble de JavaScript', () => {
    const rates = parseBccrResponse(fixture('series-compra.json'), '317')
    expect(rates.at(-1)?.value.toString()).toBe('443.27')
  })

  it('distingue «no hay datos» de un fallo, y lo dice', () => {
    expect(() => parseBccrResponse(fixture('series-vacia.json'), '318')).toThrow(BccrEmptyResponseError)
  })

  it('rechaza una respuesta con la forma cambiada', () => {
    expect(() => parseBccrResponse({ estado: true, datos: [{ series: 'no es un arreglo' }] }, '318')).toThrow()
  })

  it('rechaza una tasa no positiva en lugar de guardarla', () => {
    const roto = {
      estado: true,
      mensaje: 'Consulta exitosa',
      datos: [
        {
          codigoIndicador: '318',
          nombreIndicador: 'Tipo cambio venta',
          series: [{ fecha: '2026-09-14', valorDatoPorPeriodo: 0 }],
        },
      ],
    }
    expect(() => parseBccrResponse(roto, '318')).toThrow()
  })
})
