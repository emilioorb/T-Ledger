import { describe, expect, it } from 'vitest'
import { addMonths } from './add-months.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('addMonths', () => {
  it('avanza meses conservando el día', () => {
    expect(addMonths(utc('2026-01-15'), 3).toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  it('cruza el fin de año', () => {
    expect(addMonths(utc('2026-11-10'), 3).toISOString()).toBe('2027-02-10T00:00:00.000Z')
  })

  it('recorta el día cuando el mes destino es más corto', () => {
    expect(addMonths(utc('2026-01-31'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(addMonths(utc('2028-01-31'), 1).toISOString()).toBe('2028-02-29T00:00:00.000Z')
  })
})
