import { describe, expect, it } from 'vitest'
import { DateRange } from './date-range.js'
import { isErr, unwrap } from './result.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('DateRange', () => {
  it('cuenta los días incluyendo ambos extremos', () => {
    expect(unwrap(DateRange.create(utc('2026-01-01'), utc('2026-01-31'))).days()).toBe(31)
  })

  it('acepta un rango de un solo día', () => {
    expect(unwrap(DateRange.create(utc('2026-01-01'), utc('2026-01-01'))).days()).toBe(1)
  })

  it('reconoce si una fecha cae dentro', () => {
    const range = unwrap(DateRange.create(utc('2026-01-01'), utc('2026-01-31')))
    expect(range.contains(utc('2026-01-15'))).toBe(true)
    expect(range.contains(utc('2026-02-01'))).toBe(false)
  })

  it('rechaza un rango invertido', () => {
    expect(isErr(DateRange.create(utc('2026-01-31'), utc('2026-01-01')))).toBe(true)
  })
})
