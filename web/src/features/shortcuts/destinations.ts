import { etiquetas } from '@/features/shell/etiquetas'

export interface Destination {
  key: string
  to: string
  label: string
}

// Los destinos son datos, no un switch: la lista del diálogo de ayuda y el despachador de
// teclas se leen de la misma tabla, así que no pueden discrepar.
export const DESTINATIONS: Destination[] = [
  { key: 'h', to: '/tablero', label: etiquetas.tablero },
  { key: 'd', to: '/deudas', label: etiquetas.dinero.debts },
  { key: 'p', to: '/presupuesto', label: etiquetas.plan.budget },
  { key: 'm', to: '/metas', label: etiquetas.metas },
  { key: 'i', to: '/inversiones', label: etiquetas.inversiones },
  { key: 'y', to: '/proyeccion', label: etiquetas.proyeccion },
  { key: 'v', to: '/contabilidad/movimientos', label: etiquetas.contabilidad.movements },
  { key: 'a', to: '/contabilidad/asientos', label: etiquetas.contabilidad.journal },
  { key: 'c', to: '/banco/conciliacion', label: etiquetas.banco.reconciliation },
]
