import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { buildSchedule } from './amortization.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const PRINCIPAL = crc(10_000_000n)
const START = utc('2026-01-15')

describe('buildSchedule — francés', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: unwrap(InterestRate.create(12, 'MONTHLY')),
    termMonths: 3,
    startDate: START,
    kind: 'FRENCH',
  })

  it('reproduce la tabla calculada a mano', () => {
    expect(
      schedule.installments.map((i) => [
        i.number,
        i.interest.minorUnits,
        i.principal.minorUnits,
        i.payment.minorUnits,
        i.balance.minorUnits,
      ]),
    ).toEqual([
      [1, 100_000n, 3_300_221n, 3_400_221n, 6_699_779n],
      [2, 66_998n, 3_333_223n, 3_400_221n, 3_366_556n],
      [3, 33_666n, 3_366_556n, 3_400_222n, 0n],
    ])
  })

  it('el último pago absorbe el residuo y deja el saldo en cero exacto', () => {
    expect(schedule.finalBalance.minorUnits).toBe(0n)
    expect(schedule.installments.at(-1)?.payment.minorUnits).toBe(3_400_222n)
  })

  it('los totales cuadran con el capital más el interés', () => {
    expect(schedule.totalInterest.minorUnits).toBe(200_664n)
    expect(schedule.totalPaid.minorUnits).toBe(10_200_664n)
  })

  it('vence un mes después del inicio y avanza mes a mes', () => {
    expect(schedule.installments.map((i) => i.dueDate.toISOString())).toEqual([
      '2026-02-15T00:00:00.000Z',
      '2026-03-15T00:00:00.000Z',
      '2026-04-15T00:00:00.000Z',
    ])
  })
})

describe('buildSchedule — sin interés', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: InterestRate.zero(),
    termMonths: 3,
    startDate: START,
    kind: 'INTEREST_FREE',
  })

  it('reparte el capital sin cobrar interés y cuadra al céntimo', () => {
    expect(schedule.installments.map((i) => i.payment.minorUnits)).toEqual([
      3_333_334n,
      3_333_333n,
      3_333_333n,
    ])
    expect(schedule.totalInterest.minorUnits).toBe(0n)
    expect(schedule.totalPaid.minorUnits).toBe(10_000_000n)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildSchedule — francés con tasa 0 %', () => {
  it('se comporta como un reparto simple, no divide por cero', () => {
    const schedule = buildSchedule({
      principal: PRINCIPAL,
      rate: InterestRate.zero(),
      termMonths: 3,
      startDate: START,
      kind: 'FRENCH',
    })
    expect(schedule.totalInterest.minorUnits).toBe(0n)
    expect(schedule.totalPaid.minorUnits).toBe(10_000_000n)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildSchedule — capital fijo', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: unwrap(InterestRate.create(12, 'MONTHLY')),
    termMonths: 3,
    startDate: START,
    kind: 'FIXED_PRINCIPAL',
  })

  it('amortiza capital constante y cuota decreciente', () => {
    expect(
      schedule.installments.map((i) => [i.principal.minorUnits, i.interest.minorUnits, i.payment.minorUnits]),
    ).toEqual([
      [3_333_334n, 100_000n, 3_433_334n],
      [3_333_333n, 66_667n, 3_400_000n],
      [3_333_333n, 33_333n, 3_366_666n],
    ])
    expect(schedule.totalInterest.minorUnits).toBe(200_000n)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildSchedule — búsquedas', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: InterestRate.zero(),
    termMonths: 3,
    startDate: START,
    kind: 'INTEREST_FREE',
  })

  it('encuentra la cuota que vence en un mes dado', () => {
    expect(schedule.installmentDueIn(2026, 3)?.number).toBe(2)
    expect(schedule.installmentDueIn(2026, 12)).toBeUndefined()
  })
})

describe('buildSchedule — entradas inválidas', () => {
  it('rechaza un plazo no positivo', () => {
    expect(() =>
      buildSchedule({
        principal: PRINCIPAL,
        rate: InterestRate.zero(),
        termMonths: 0,
        startDate: START,
        kind: 'FRENCH',
      }),
    ).toThrow(RangeError)
  })
})
