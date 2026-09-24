import { etiquetas } from '@/features/shell/etiquetas'
import { copy as shell } from '@/features/shell/copy'

export const ACCOUNTING_LABELS: Record<string, string> = {
  movimientos: etiquetas.contabilidad.movements,
  asientos: etiquetas.contabilidad.journal,
  cuentas: etiquetas.contabilidad.accounts,
  categorias: etiquetas.contabilidad.categories,
  mayor: etiquetas.contabilidad.ledger,
  comprobacion: etiquetas.contabilidad.trialBalance,
  patrimonio: etiquetas.contabilidad.netWorth,
  situacion: etiquetas.contabilidad.financialPosition,
  resultados: etiquetas.contabilidad.incomeStatement,
  cierre: etiquetas.contabilidad.closing,
}

export const PLAN_LABELS: Record<string, string> = {
  presupuesto: etiquetas.plan.budget,
  metas: etiquetas.metas,
  inversiones: etiquetas.inversiones,
  proyeccion: etiquetas.proyeccion,
}

export const BANKING_LABELS: Record<string, string> = {
  cuentas: etiquetas.banco.accounts,
  importar: etiquetas.banco.import,
  conciliacion: etiquetas.banco.reconciliation,
}

// Cómo se llama la pantalla en la que estás, derivado de la ruta y no declarado por cada
// pantalla: lo usan la miga del encabezado y el título de la pestaña, que hasta ahora decía
// «T-Ledger» en las veintiocho.
export const screenNameFor = (pathname: string): string | null => {
  const [section, second] = pathname.split('/').filter(Boolean)

  if (!section) return etiquetas.portada
  if (section === 'tablero') return etiquetas.tablero
  if (section === 'banco') return BANKING_LABELS[second ?? ''] ?? etiquetas.banco.section
  if (section === 'contabilidad') return ACCOUNTING_LABELS[second ?? ''] ?? etiquetas.contabilidad.section
  if (section === 'presupuesto' && second === 'modelos') return etiquetas.plan.models
  if (section in PLAN_LABELS) return PLAN_LABELS[section] ?? null
  if (section === 'deudas') return etiquetas.dinero.debts
  if (section === 'plan-de-pago') return etiquetas.dinero.payoffPlan
  if (section === 'novedades') return shell.nav.releases
  if (section === 'guia') return etiquetas.guia
  if (section === 'auditoria') return etiquetas.registro
  if (section === 'cuenta') return etiquetas.cuenta
  if (section === 'libro') return etiquetas.libro
  // Las pantallas sin sesión también son pantallas. Faltaban, y eso tenía una consecuencia
  // que no se veía venir: al cerrar la sesión por inactividad, el vigilante navega a
  // `/entrar` mientras el título todavía se está recalculando, no encontraba la ruta y la
  // pestaña quedaba diciendo «Esta dirección no existe» encima del formulario de ingreso.
  if (section === 'entrar') return etiquetas.entrar
  if (section === 'crear-cuenta') return etiquetas.crearCuenta
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
