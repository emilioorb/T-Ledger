import { describe, expect, it } from 'vitest'
import { copy as landing } from '@/features/landing/copy'
import { copy as overview } from '@/features/projection/overview-copy'
import { documentTitleFor, screenNameFor } from './page-title'

describe('screenNameFor', () => {
  it('la raíz es la landing', () => {
    expect(screenNameFor('/')).toBe(landing.tab)
  })

  it('el tablero vive en /tablero', () => {
    expect(screenNameFor('/tablero')).toBe(overview.overview.title)
  })

  it('una ruta que no existe se dice que no existe', () => {
    expect(screenNameFor('/lo-que-sea')).not.toBe(overview.overview.title)
  })
})

describe('documentTitleFor', () => {
  it('pone el nombre de la app al final', () => {
    expect(documentTitleFor('/tablero')).toBe(`${overview.overview.title} · T-Ledger`)
  })
})
