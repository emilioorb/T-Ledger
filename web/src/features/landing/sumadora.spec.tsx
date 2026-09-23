import { act, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { finDe, marcaEn, TIRADA, useSumadora, type Paso } from './sumadora'

const PASOS: Paso[] = [
  { en: 100, hasta: 20_000 },
  { en: 300, hasta: 870_000 },
  { en: 500, hasta: 920_000 },
]

describe('la sumadora', () => {
  it('arranca en cero', () => {
    expect(marcaEn(0, PASOS)).toBe(0)
    expect(marcaEn(99, PASOS)).toBe(0)
  })

  it('cada tirada termina exactamente en su acumulado', () => {
    expect(marcaEn(100 + TIRADA, [PASOS[0]!])).toBe(20_000)
  })

  it('nunca pasa del total ni vuelve atrás', () => {
    let anterior = 0
    for (let ms = 0; ms <= finDe(PASOS); ms += 7) {
      const marca = marcaEn(ms, PASOS)
      expect(marca).toBeGreaterThanOrEqual(anterior)
      expect(marca).toBeLessThanOrEqual(920_000)
      anterior = marca
    }
  })

  it('al terminar marca el total', () => {
    expect(marcaEn(finDe(PASOS), PASOS)).toBe(920_000)
  })
})

describe('useSumadora', () => {
  afterEach(() => vi.unstubAllGlobals())

  const conMovimientoReducido = () =>
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce') }))

  const sonda = (marcas: number[]) => () => {
    marcas.push(useSumadora(PASOS, 0))
    return null
  }

  it('creada en el navegador, con movimiento reducido marca el total desde el primer render', () => {
    conMovimientoReducido()
    const marcas: number[] = []
    const Sonda = sonda(marcas)

    render(<Sonda />)

    expect(marcas[0]).toBe(920_000)
  })

  it('al hidratar la portada prerenderizada, el primer render marca cero, como el HTML', async () => {
    conMovimientoReducido()
    const marcas: number[] = []
    const Sonda = sonda(marcas)
    const contenedor = document.createElement('div')
    contenedor.innerHTML = renderToString(<Sonda />)
    marcas.length = 0

    await act(async () => {
      hydrateRoot(contenedor, <Sonda />)
    })

    expect(marcas[0]).toBe(0)
    expect(marcas.at(-1)).toBe(920_000)
  })
})
