import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { AccountingPeriod, PeriodKey } from './accounting-period.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('PeriodKey', () => {
  it('se construye desde una fecha', () => {
    expect(PeriodKey.fromDate(utc('2026-09-16')).toString()).toBe('2026-09')
  })

  it('se parsea desde texto', () => {
    expect(unwrap(PeriodKey.parse('2026-09')).month).toBe(9)
    expect(isErr(PeriodKey.parse('09/2026'))).toBe(true)
    expect(isErr(PeriodKey.parse('2026-13'))).toBe(true)
  })

  it('avanza y retrocede cruzando el año', () => {
    expect(unwrap(PeriodKey.of(2026, 12)).next().toString()).toBe('2027-01')
    expect(unwrap(PeriodKey.of(2026, 1)).previous().toString()).toBe('2025-12')
  })

  it('reconoce si una fecha cae dentro, incluidos los bordes', () => {
    const septiembre = unwrap(PeriodKey.of(2026, 9))
    expect(septiembre.contains(utc('2026-09-01'))).toBe(true)
    expect(septiembre.contains(utc('2026-09-30'))).toBe(true)
    expect(septiembre.contains(utc('2026-10-01'))).toBe(false)
    expect(septiembre.contains(utc('2026-08-31'))).toBe(false)
  })

  it('su rango cubre el mes completo, incluido febrero bisiesto', () => {
    const febrero = unwrap(PeriodKey.of(2028, 2))
    expect(febrero.range().to.toISOString().slice(0, 10)).toBe('2028-02-29')
  })

  it('ordena cronológicamente', () => {
    const agosto = unwrap(PeriodKey.of(2026, 8))
    const septiembre = unwrap(PeriodKey.of(2026, 9))
    expect(agosto.compareTo(septiembre)).toBe(-1)
    expect(septiembre.compareTo(agosto)).toBe(1)
    expect(agosto.compareTo(agosto)).toBe(0)
  })
})

describe('AccountingPeriod', () => {
  it('nace abierto', () => {
    expect(AccountingPeriod.open(unwrap(PeriodKey.of(2026, 9))).isClosed()).toBe(false)
  })

  it('cerrar devuelve uno nuevo, sin mutar el original', () => {
    const abierto = AccountingPeriod.open(unwrap(PeriodKey.of(2026, 8)))
    const cerrado = abierto.close(utc('2026-09-01'))

    expect(cerrado.isClosed()).toBe(true)
    expect(cerrado.closedAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(abierto.isClosed()).toBe(false)
  })

  it('reabrir limpia la marca de cierre', () => {
    const reabierto = AccountingPeriod.open(unwrap(PeriodKey.of(2026, 8)))
      .close(utc('2026-09-01'))
      .reopen()

    expect(reabierto.isClosed()).toBe(false)
    expect(reabierto.closedAt).toBeNull()
  })
})
