import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { buildSchedule, type ScheduleParams } from './amortization.js'
import { buildScheduleWithExtraPayment } from './extra-payment.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const interestFree = (termMonths: number): ScheduleParams => ({
  principal: crc(10_000_000n),
  rate: InterestRate.zero(),
  termMonths,
  startDate: utc('2026-01-15'),
  kind: 'INTEREST_FREE',
})

describe('buildScheduleWithExtraPayment — acortar plazo', () => {
  it('termina antes manteniendo la cuota', () => {
    const schedule = buildScheduleWithExtraPayment(interestFree(4), {
      amount: crc(2_500_000n),
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })

    expect(schedule.installments.map((i) => i.payment.minorUnits)).toEqual([
      2_500_000n,
      2_500_000n,
      2_500_000n,
    ])
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildScheduleWithExtraPayment — bajar cuota', () => {
  it('mantiene el plazo y redistribuye el saldo restante', () => {
    const schedule = buildScheduleWithExtraPayment(interestFree(4), {
      amount: crc(2_000_000n),
      afterInstallment: 1,
      mode: 'REDUCE_PAYMENT',
    })

    expect(schedule.installments.map((i) => i.payment.minorUnits)).toEqual([
      2_500_000n,
      1_833_334n,
      1_833_333n,
      1_833_333n,
    ])
    expect(schedule.installments).toHaveLength(4)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildScheduleWithExtraPayment — con interés', () => {
  const params: ScheduleParams = {
    principal: crc(10_000_000n),
    rate: unwrap(InterestRate.create(12, 'MONTHLY')),
    termMonths: 12,
    startDate: utc('2026-01-15'),
    kind: 'FRENCH',
  }

  it('paga menos interés y termina antes al acortar plazo', () => {
    const baseline = buildSchedule(params)
    const improved = buildScheduleWithExtraPayment(params, {
      amount: crc(3_000_000n),
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })

    expect(improved.installments.length).toBeLessThan(baseline.installments.length)
    expect(improved.totalInterest.minorUnits).toBeLessThan(baseline.totalInterest.minorUnits)
    expect(improved.finalBalance.minorUnits).toBe(0n)
  })

  it('el capital amortizado más el abono iguala el capital original', () => {
    const extra = crc(3_000_000n)
    const improved = buildScheduleWithExtraPayment(params, {
      amount: extra,
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })
    const amortized = improved.installments.reduce((acc, i) => acc + i.principal.minorUnits, 0n)
    expect(amortized + extra.minorUnits).toBe(10_000_000n)
  })

  it('un abono que cubre el saldo cierra la deuda en esa cuota', () => {
    const improved = buildScheduleWithExtraPayment(params, {
      amount: crc(50_000_000n),
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })
    expect(improved.installments).toHaveLength(1)
    expect(improved.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildScheduleWithExtraPayment — entradas inválidas', () => {
  it('rechaza un abono posterior a la última cuota', () => {
    expect(() =>
      buildScheduleWithExtraPayment(interestFree(4), {
        amount: crc(1_000n),
        afterInstallment: 9,
        mode: 'REDUCE_TERM',
      }),
    ).toThrow(RangeError)
  })

  it('rechaza un abono de monto no positivo', () => {
    expect(() =>
      buildScheduleWithExtraPayment(interestFree(4), {
        amount: crc(0n),
        afterInstallment: 1,
        mode: 'REDUCE_TERM',
      }),
    ).toThrow(RangeError)
  })
})
