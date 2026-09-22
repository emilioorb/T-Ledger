import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { PeriodKey } from './accounting-period.js'
import { blockersFor, type PeriodSnapshot } from './period-closing.js'

const snapshot = (overrides: Partial<PeriodSnapshot> = {}): PeriodSnapshot => ({
  key: unwrap(PeriodKey.of(2026, 9)),
  status: 'OPEN',
  entryCount: 3,
  unpostedMovementCount: 0,
  trialBalanceBalances: true,
  previousClosed: true,
  ...overrides,
})

describe('blockersFor', () => {
  it('sin bloqueos, el mes se puede cerrar', () => {
    expect(blockersFor(snapshot())).toEqual([])
  })

  it('bloquea si el mes anterior sigue abierto, y lo nombra', () => {
    const blockers = blockersFor(snapshot({ previousClosed: false }))

    expect(blockers.map((b) => b.code)).toEqual(['PREVIOUS_PERIOD_OPEN'])
    expect(blockers[0]?.reason).toContain('2026-08')
  })

  it('bloquea si hay movimientos sin asiento, y dice cuántos', () => {
    const blockers = blockersFor(snapshot({ unpostedMovementCount: 4 }))

    expect(blockers.map((b) => b.code)).toEqual(['UNPOSTED_MOVEMENTS'])
    expect(blockers[0]?.reason).toContain('4')
  })

  it('bloquea si la comprobación no cuadra', () => {
    expect(blockersFor(snapshot({ trialBalanceBalances: false })).map((b) => b.code)).toEqual([
      'TRIAL_BALANCE_UNBALANCED',
    ])
  })

  it('bloquea si el período ya está cerrado', () => {
    expect(blockersFor(snapshot({ status: 'CLOSED' })).map((b) => b.code)).toEqual([
      'ALREADY_CLOSED',
    ])
  })

  it('acumula todos los bloqueos, no se detiene en el primero', () => {
    const blockers = blockersFor(
      snapshot({ previousClosed: false, unpostedMovementCount: 2, trialBalanceBalances: false }),
    )

    expect(blockers).toHaveLength(3)
  })

  it('un mes sin asientos se puede cerrar: vacío no es inválido', () => {
    expect(blockersFor(snapshot({ entryCount: 0 }))).toEqual([])
  })
})
