import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Investment, type InvestmentProps } from './investment.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const props: InvestmentProps = {
  id: 'plazo',
  name: 'Certificado a plazo',
  principal: crc(1_000_000n),
  rate: unwrap(InterestRate.create(12, 'MONTHLY')),
  openedAt: utc('2026-01-15'),
  kind: 'FIXED_TERM',
  maturesAt: utc('2027-01-15'),
  accountCode: null,
  contributions: [],
}

const inversion = (overrides: Partial<InvestmentProps> = {}) =>
  unwrap(Investment.create({ ...props, ...overrides }))

const aporteUsd = () => ({
  id: 'usd',
  date: utc('2026-07-15'),
  amount: Money.fromMinorUnits(1_000n, 'USD'),
})

describe('Investment', () => {
  it('reproduce el cálculo de interés compuesto hecho a mano', () => {
    expect(inversion().valueAt(utc('2026-04-15')).minorUnits).toBe(1_030_301n)
    expect(inversion().interestEarnedAt(utc('2026-04-15')).minorUnits).toBe(30_301n)
  })

  it('capitaliza doce meses igual que el cálculo a mano', () => {
    expect(inversion().valueAt(utc('2027-01-15')).minorUnits).toBe(1_126_825n)
  })

  it('en la fecha de apertura vale el capital, sin interés', () => {
    expect(inversion().valueAt(utc('2026-01-15')).minorUnits).toBe(1_000_000n)
    expect(inversion().interestEarnedAt(utc('2026-01-15')).isZero()).toBe(true)
  })

  it('antes de la apertura vale el capital y no un valor negativo', () => {
    expect(inversion().valueAt(utc('2025-01-01')).minorUnits).toBe(1_000_000n)
  })

  it('una inversión a plazo deja de capitalizar en su vencimiento', () => {
    const alVencer = inversion().valueAt(utc('2027-01-15')).minorUnits
    expect(inversion().valueAt(utc('2028-01-15')).minorUnits).toBe(alVencer)
  })

  it('una inversión abierta sigue capitalizando indefinidamente', () => {
    const abierta = inversion({ kind: 'OPEN', maturesAt: null })
    expect(abierta.valueAt(utc('2028-01-15')).minorUnits).toBeGreaterThan(
      abierta.valueAt(utc('2027-01-15')).minorUnits,
    )
  })

  it('un aporte capitaliza desde su propia fecha, no desde la apertura', () => {
    const conAporte = inversion({
      contributions: [{ id: 'c1', date: utc('2026-07-15'), amount: crc(1_000_000n) }],
    })

    // El capital original lleva doce meses; el aporte, seis.
    const esperado = 1_126_825n + 1_061_520n
    expect(conAporte.valueAt(utc('2027-01-15')).minorUnits).toBe(esperado)
  })

  it('un aporte futuro no vale ni rinde todavía', () => {
    const conAporte = inversion({
      contributions: [{ id: 'c1', date: utc('2026-07-15'), amount: crc(1_000_000n) }],
    })

    expect(conAporte.valueAt(utc('2026-01-15')).minorUnits).toBe(1_000_000n)
    expect(conAporte.investedAt(utc('2026-01-15')).minorUnits).toBe(1_000_000n)
    expect(conAporte.interestEarnedAt(utc('2026-01-15')).isZero()).toBe(true)
  })

  it('reporta el mes en que el capital vuelve a estar disponible', () => {
    expect(inversion().maturityPeriod()).toEqual({ year: 2027, month: 1 })
    expect(inversion({ kind: 'OPEN', maturesAt: null }).maturityPeriod()).toBeNull()
  })

  it('una tasa de 0 % mantiene el capital sin inventar rendimiento', () => {
    const sinInteres = inversion({ rate: InterestRate.zero() })
    expect(sinInteres.valueAt(utc('2027-01-15')).minorUnits).toBe(1_000_000n)
  })

  it('rechaza un plazo fijo sin fecha de vencimiento', () => {
    expect(isErr(Investment.create({ ...props, kind: 'FIXED_TERM', maturesAt: null }))).toBe(true)
  })

  it('rechaza un vencimiento anterior a la apertura', () => {
    expect(isErr(Investment.create({ ...props, maturesAt: utc('2025-01-01') }))).toBe(true)
  })

  it('rechaza un capital no positivo y un aporte de otra moneda', () => {
    expect(isErr(Investment.create({ ...props, principal: crc(0n) }))).toBe(true)
    expect(isErr(inversion().addContribution(aporteUsd()))).toBe(true)
  })

  it('sabe si ya venció a una fecha', () => {
    expect(inversion().isMaturedAt(utc('2026-06-01'))).toBe(false)
    expect(inversion().isMaturedAt(utc('2027-02-01'))).toBe(true)
    expect(inversion({ kind: 'OPEN', maturesAt: null }).isMaturedAt(utc('2030-01-01'))).toBe(false)
  })
})
