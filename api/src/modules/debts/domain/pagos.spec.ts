import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Debt, type DebtProps } from './debt.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// Tres cuotas: 15/02, 15/03 y 15/04 de 2026.
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

const pagar = (debt: Debt, fecha: string, movementId: string | null = null) =>
  unwrap(debt.registerPayment({ date: utc(fecha), movementId }))

describe('los pagos de una deuda propia', () => {
  it('el saldo no baja por calendario: una cuota vencida sin pago no cuenta', () => {
    const debt = unwrap(Debt.create(props()))

    expect(debt.balanceAt(utc('2026-03-20')).minorUnits).toBe(10_000_000n)
  })

  it('el saldo baja con cada pago registrado, a la fecha del pago', () => {
    const pagada = pagar(unwrap(Debt.create(props())), '2026-02-14')

    expect(pagada.balanceAt(utc('2026-02-13')).minorUnits).toBe(10_000_000n)
    expect(pagada.balanceAt(utc('2026-02-14')).minorUnits).toBe(6_699_779n)
  })

  it('paga siempre la siguiente cuota, en orden', () => {
    const debt = pagar(pagar(unwrap(Debt.create(props())), '2026-02-15'), '2026-03-15')

    expect(debt.payments.map((pago) => pago.installmentNumber)).toEqual([1, 2])
  })

  it('no acepta un pago cuando ya no quedan cuotas', () => {
    let debt = unwrap(Debt.create(props()))
    for (const fecha of ['2026-02-15', '2026-03-15', '2026-04-15']) debt = pagar(debt, fecha)

    expect(isErr(debt.registerPayment({ date: utc('2026-05-01'), movementId: null }))).toBe(true)
  })

  it('no acepta un pago con fecha anterior al último', () => {
    const debt = pagar(unwrap(Debt.create(props())), '2026-02-15')

    expect(isErr(debt.registerPayment({ date: utc('2026-02-01'), movementId: null }))).toBe(true)
  })

  it('cada cuota dice si está pagada, atrasada o pendiente', () => {
    const debt = pagar(unwrap(Debt.create(props())), '2026-02-15')

    expect(debt.installmentStatuses(utc('2026-03-20'))).toEqual(['PAID', 'OVERDUE', 'PENDING'])
  })

  it('deshacer el último pago devuelve la cuota y su movimiento', () => {
    const debt = pagar(pagar(unwrap(Debt.create(props())), '2026-02-15'), '2026-03-15', 'mov-2')

    const { debt: sinElUltimo, undone } = unwrap(debt.undoLastPayment())

    expect(undone).toMatchObject({ installmentNumber: 2, movementId: 'mov-2' })
    expect(sinElUltimo.payments).toHaveLength(1)
  })

  it('no hay nada que deshacer en una deuda sin pagos', () => {
    expect(isErr(unwrap(Debt.create(props())).undoLastPayment())).toBe(true)
  })
})

describe('una deuda que se carga ya empezada', () => {
  it('da por pagadas sin movimiento las cuotas vencidas al cargarla', () => {
    const debt = unwrap(Debt.create(props())).settleDueBefore(utc('2026-03-20'))

    expect(debt.payments).toEqual([
      { installmentNumber: 1, date: utc('2026-02-15'), movementId: null },
      { installmentNumber: 2, date: utc('2026-03-15'), movementId: null },
    ])
  })

  it('una deuda que todavía no empezó queda sin pagos', () => {
    expect(unwrap(Debt.create(props())).settleDueBefore(utc('2026-01-20')).payments).toEqual([])
  })
})
