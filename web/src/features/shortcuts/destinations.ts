import { copy as accounting } from '@/features/accounting/copy'
import { copy as banking } from '@/features/banking/copy'
import { copy as budget } from '@/features/budget/copy'
import { copy as debts } from '@/features/debts/copy'
import { copy as goals } from '@/features/goals/copy'
import { copy as investments } from '@/features/investments/copy'
import { copy as overview } from '@/features/projection/overview-copy'
import { copy as projection } from '@/features/projection/copy'

export interface Destination {
  key: string
  to: string
  label: string
}

// Los destinos son datos, no un switch: la lista del diálogo de ayuda y el despachador de
// teclas se leen de la misma tabla, así que no pueden discrepar.
export const DESTINATIONS: Destination[] = [
  { key: 'h', to: '/tablero', label: overview.overview.title },
  { key: 'd', to: '/deudas', label: debts.nav.debts },
  { key: 'p', to: '/presupuesto', label: budget.nav.budget },
  { key: 'm', to: '/metas', label: goals.goals.title },
  { key: 'i', to: '/inversiones', label: investments.investments.title },
  { key: 'y', to: '/proyeccion', label: projection.projection.title },
  { key: 'v', to: '/contabilidad/movimientos', label: accounting.nav.movements },
  { key: 'a', to: '/contabilidad/asientos', label: accounting.nav.journal },
  { key: 'c', to: '/banco/conciliacion', label: banking.nav.reconciliation },
]
