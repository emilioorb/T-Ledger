import { copy as accounting } from '@/features/accounting/copy'
import { copy as banking } from '@/features/banking/copy'
import { copy as budget } from '@/features/budget/copy'
import { copy as debts } from '@/features/debts/copy'
import { copy as goals } from '@/features/goals/copy'
import { copy as investments } from '@/features/investments/copy'
import { copy as projection } from '@/features/projection/copy'
import { copy as overview } from '@/features/projection/overview-copy'
import { copy as shell } from '@/features/shell/copy'
import { copy as guide } from '@/features/shell/guide-copy'
import { copy as auditoria } from '@/features/auditoria/copy'
import { copy as identity } from '@/features/identity/copy'

export const ACCOUNTING_LABELS: Record<string, string> = {
  movimientos: accounting.nav.movements,
  asientos: accounting.nav.journal,
  cuentas: accounting.nav.accounts,
  categorias: accounting.nav.categories,
  mayor: accounting.nav.ledger,
  comprobacion: accounting.nav.trialBalance,
  patrimonio: accounting.nav.netWorth,
  situacion: accounting.nav.financialPosition,
  resultados: accounting.nav.incomeStatement,
  cierre: accounting.nav.closing,
}

export const PLAN_LABELS: Record<string, string> = {
  presupuesto: budget.nav.budget,
  metas: goals.goals.title,
  inversiones: investments.investments.title,
  proyeccion: projection.projection.title,
}

export const BANKING_LABELS: Record<string, string> = {
  cuentas: banking.nav.accounts,
  importar: banking.nav.import,
  conciliacion: banking.nav.reconciliation,
}

// Cómo se llama la pantalla en la que estás, derivado de la ruta y no declarado por cada
// pantalla: lo usan la miga del encabezado y el título de la pestaña, que hasta ahora decía
// «Tape» en las veintiocho.
export const screenNameFor = (pathname: string): string | null => {
  const [section, second] = pathname.split('/').filter(Boolean)

  if (!section) return overview.overview.title
  if (section === 'banco') return BANKING_LABELS[second ?? ''] ?? banking.nav.section
  if (section === 'contabilidad') return ACCOUNTING_LABELS[second ?? ''] ?? accounting.nav.section
  if (section === 'presupuesto' && second === 'modelos') return budget.nav.models
  if (section in PLAN_LABELS) return PLAN_LABELS[section] ?? null
  if (section === 'deudas') return debts.nav.debts
  if (section === 'plan-de-pago') return debts.nav.payoffPlan
  if (section === 'novedades') return shell.nav.releases
  if (section === 'guia') return guide.guide.title
  if (section === 'auditoria') return auditoria.audit.title
  // Las pantallas sin sesión también son pantallas. Faltaban, y eso tenía una consecuencia
  // que no se veía venir: al cerrar la sesión por inactividad, el vigilante navega a
  // `/entrar` mientras el título todavía se está recalculando, no encontraba la ruta y la
  // pestaña quedaba diciendo «Esta dirección no existe» encima del formulario de ingreso.
  if (section === 'entrar') return identity.entrar.tab
  if (section === 'crear-cuenta') return identity.crear.tab
  // Una ruta que no existe también tiene nombre: la pestaña dice que te perdiste, no el
  // nombre de la app como si estuvieras en algún lado.
  return shell.notFound.title
}

// El nombre de la app va al final: lo que cambia entre pestañas es la pantalla, y una lista
// de pestañas que empiezan todas igual no se puede leer de reojo.
export const documentTitleFor = (pathname: string): string => {
  const screen = screenNameFor(pathname)
  return screen ? `${screen} · ${shell.app.name}` : shell.app.name
}
