import { act, render } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDesfaseDeHidratacion } from './desfase-de-hidratacion'

const medido: number[] = []
const Sonda = () => {
  medido.push(useDesfaseDeHidratacion())
  return null
}

let raiz: Root | undefined
const hidratar = async () => {
  const contenedor = document.createElement('div')
  contenedor.innerHTML = renderToString(<Sonda />)
  medido.length = 0
  await act(async () => {
    raiz = hydrateRoot(contenedor, <Sonda />)
  })
  return medido.at(-1)
}

describe('useDesfaseDeHidratacion', () => {
  afterEach(() => {
    act(() => raiz?.unmount())
    raiz = undefined
    medido.length = 0
    vi.restoreAllMocks()
  })

  it('es cero cuando la portada se crea en el navegador: la coreografía arranca ahora', () => {
    render(<Sonda />)

    expect(medido.at(-1)).toBe(0)
  })

  it('al hidratar, es lo que pasó desde el primer pintado', async () => {
    vi.spyOn(performance, 'getEntriesByName').mockReturnValue([{ startTime: 100 } as PerformanceEntry])
    vi.spyOn(performance, 'now').mockReturnValue(1_500)

    expect(await hidratar()).toBe(1_400)
  })

  it('al hidratar sin registro del primer pintado, arranca ahora en vez de darla por terminada', async () => {
    vi.spyOn(performance, 'getEntriesByName').mockReturnValue([])

    expect(await hidratar()).toBe(0)
  })
})
