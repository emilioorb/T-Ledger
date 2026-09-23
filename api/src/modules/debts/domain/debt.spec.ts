import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Debt, type DebtProps } from './debt.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const props = (overrides: Partial<DebtProps> = {}): DebtProps => ({
  id: 'conape',
  name: 'CONAPE',
  counterparty: 'CONAPE',
  principal: crc(10_000_000n),
  rate: unwrap(InterestRate.create(12, 'MONTHLY')),
  termMonths: 3,
  startDate: utc('2026-01-15'),
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
  ...overrides,
})

describe('Debt', () => {
  it('expone la tabla de amortización de su propio estado', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.schedule().installments).toHaveLength(3)
    expect(debt.schedule().finalBalance.minorUnits).toBe(0n)
  })

  it('reporta la fecha en que queda libre la cuota', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.payoffDate().toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  // Lo que te deben sigue por calendario: no hay de dónde saber cuándo te pagaron.
  it('un préstamo otorgado reporta el saldo por calendario', () => {
    const debt = unwrap(Debt.create(props({ direction: 'LENT', budgetBucket: null })))
    expect(debt.balanceAt(utc('2026-01-01')).minorUnits).toBe(10_000_000n)
    expect(debt.balanceAt(utc('2026-02-20')).minorUnits).toBe(6_699_779n)
    expect(debt.balanceAt(utc('2027-01-01')).minorUnits).toBe(0n)
  })

  it('reporta la cuota que vence en un mes, y cero si ya terminó', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.installmentDueIn(2026, 2).minorUnits).toBe(3_400_221n)
    expect(debt.installmentDueIn(2026, 12).minorUnits).toBe(0n)
  })

  it('acepta una deuda sin interés, como la de los padres', () => {
    const debt = unwrap(
      Debt.create(props({ rate: InterestRate.zero(), kind: 'INTEREST_FREE', name: 'Papás' })),
    )
    expect(debt.schedule().totalInterest.minorUnits).toBe(0n)
  })

  it('compara los escenarios con y sin abono', () => {
    const debt = unwrap(Debt.create(props({ termMonths: 12 })))
    const projection = unwrap(
      debt.applyExtraPayment({ amount: crc(3_000_000n), afterInstallment: 1, mode: 'REDUCE_TERM' }),
    )

    expect(projection.monthsSaved).toBeGreaterThan(0)
    expect(projection.interestSaved.minorUnits).toBeGreaterThan(0n)
    expect(projection.interestSaved.minorUnits).toBe(
      projection.baseline.totalInterest.minorUnits - projection.withExtraPayment.totalInterest.minorUnits,
    )
    expect(projection.totalPaidWithExtra.minorUnits).toBe(
      projection.withExtraPayment.totalPaid.minorUnits + 3_000_000n,
    )
  })

  it('devuelve Err en vez de lanzar cuando el abono es inválido', () => {
    const debt = unwrap(Debt.create(props()))
    const result = debt.applyExtraPayment({ amount: crc(0n), afterInstallment: 1, mode: 'REDUCE_TERM' })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza un capital no positivo y un plazo no positivo', () => {
    expect(isErr(Debt.create(props({ principal: crc(0n) })))).toBe(true)
    expect(isErr(Debt.create(props({ termMonths: 0 })))).toBe(true)
  })

  it('rechaza un nombre o una contraparte vacíos', () => {
    expect(isErr(Debt.create(props({ name: '   ' })))).toBe(true)
    expect(isErr(Debt.create(props({ counterparty: '  ' })))).toBe(true)
  })

  it('modela un préstamo otorgado con la misma tabla que la deuda equivalente', () => {
    const lent = unwrap(
      Debt.create(
        props({
          id: 'andres',
          name: 'Préstamo a Andrés',
          counterparty: 'Andrés',
          direction: 'LENT',
          budgetBucket: null,
        }),
      ),
    )
    expect(lent.isLent()).toBe(true)
    expect(lent.isBorrowed()).toBe(false)
    expect(lent.schedule().installments.map((i) => i.payment.minorUnits)).toEqual(
      unwrap(Debt.create(props())).schedule().installments.map((i) => i.payment.minorUnits),
    )
  })

  it('exige cubeta a lo que se debe y la prohíbe en lo que se presta', () => {
    expect(isErr(Debt.create(props({ budgetBucket: null })))).toBe(true)
    expect(isErr(Debt.create(props({ direction: 'LENT', budgetBucket: 'necesidades' })))).toBe(true)
  })
})
