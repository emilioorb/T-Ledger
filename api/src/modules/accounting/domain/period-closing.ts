import type { PeriodKey, PeriodStatus } from './accounting-period.js'

export interface CloseBlocker {
  readonly code: string
  readonly reason: string
}

export interface PeriodSnapshot {
  readonly key: PeriodKey
  readonly status: PeriodStatus
  readonly entryCount: number
  readonly unpostedMovementCount: number
  readonly trialBalanceBalances: boolean
  readonly previousClosed: boolean
}

// Se acumulan todos los bloqueos en vez de cortar en el primero: la pantalla
// muestra la lista completa de lo que falta y Emilio no los descubre de a uno.
export const blockersFor = (snapshot: PeriodSnapshot): CloseBlocker[] => {
  const blockers: CloseBlocker[] = []

  if (snapshot.status === 'CLOSED') {
    blockers.push({ code: 'ALREADY_CLOSED', reason: 'El período ya está cerrado.' })
  }

  if (!snapshot.previousClosed) {
    blockers.push({
      code: 'PREVIOUS_PERIOD_OPEN',
      reason: `Cerrá primero ${snapshot.key.previous().toString()}: los meses se cierran en orden.`,
    })
  }

  if (snapshot.unpostedMovementCount > 0) {
    blockers.push({
      code: 'UNPOSTED_MOVEMENTS',
      reason: `Hay ${snapshot.unpostedMovementCount} movimientos sin asiento. Asignales una categoría con cuenta contable.`,
    })
  }

  if (!snapshot.trialBalanceBalances) {
    blockers.push({
      code: 'TRIAL_BALANCE_UNBALANCED',
      reason: 'La comprobación del período no cuadra.',
    })
  }

  // Un mes sin asientos no es un bloqueo: un mes en el que no pasó nada es cerrable.
  return blockers
}
