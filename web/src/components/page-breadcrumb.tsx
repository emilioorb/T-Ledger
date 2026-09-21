import { Link, useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { copy as accounting } from '@/features/accounting/copy'
import { copy as banking } from '@/features/banking/copy'
import { copy as budget } from '@/features/budget/copy'
import { copy as goals } from '@/features/goals/copy'
import { copy as investments } from '@/features/investments/copy'
import { copy as projection } from '@/features/projection/copy'
import { copy as overview } from '@/features/projection/overview-copy'
import { copy as shell } from '@/features/shell/copy'
import { copy as guide } from '@/features/shell/guide-copy'
import { copy } from '@/features/debts/copy'
import { useDebt } from '@/features/debts/use-debts'
import { useGoal } from '@/features/goals/use-goals'
import { today } from '@/lib/dates'
import { useInvestmentProjection } from '@/features/investments/use-investments'

const ACCOUNTING_LABELS: Record<string, string> = {
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

const PLAN_LABELS: Record<string, string> = {
  presupuesto: budget.nav.budget,
  metas: goals.goals.title,
  inversiones: investments.investments.title,
  proyeccion: projection.projection.title,
}

const BANKING_LABELS: Record<string, string> = {
  cuentas: banking.nav.accounts,
  importar: banking.nav.import,
  conciliacion: banking.nav.reconciliation,
}

const Crumb = ({ to, label }: { to: string; label: string }) => (
  <>
    <BreadcrumbItem>
      <BreadcrumbLink asChild>
        <Link to={to} className="inline-flex min-h-6 items-center">
          {label}
        </Link>
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
  </>
)

const DebtCrumbs = ({ id }: { id: string }) => {
  const debt = useDebt(id)

  return (
    <>
      <Crumb to="/deudas" label={copy.nav.debts} />
      <BreadcrumbItem>
        <BreadcrumbPage>{debt.data?.name ?? '…'}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

const GoalCrumbs = ({ id }: { id: string }) => {
  const goal = useGoal(id)
  return (
    <>
      <Crumb to="/metas" label={goals.goals.title} />
      <BreadcrumbItem>
        <BreadcrumbPage>{goal.data?.name ?? '…'}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

const InvestmentCrumbs = ({ id }: { id: string }) => {
  const investment = useInvestmentProjection(id, today())
  return (
    <>
      <Crumb to="/inversiones" label={investments.investments.title} />
      <BreadcrumbItem>
        <BreadcrumbPage>{investment.data?.name ?? '…'}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

// La miga se deriva de la ruta, no la declara cada pantalla: una pantalla que se olvide
// de declararla dejaría el encabezado mintiendo sobre dónde estás.
export const PageBreadcrumb = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [section, second] = pathname.split('/').filter(Boolean)

  const leaf = (label: string) => (
    <BreadcrumbItem>
      <BreadcrumbPage>{label}</BreadcrumbPage>
    </BreadcrumbItem>
  )

  // Una ruta que no conocemos no hereda la miga de otra pantalla: se queda sin miga, y la
  // pantalla de «no existe» dice lo suyo.
  if (!section) {
    return (
      <Breadcrumb>
        <BreadcrumbList>{leaf(overview.overview.title)}</BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap whitespace-nowrap">
        {section === 'banco' ? (
          <>
            <BreadcrumbItem>{banking.nav.section}</BreadcrumbItem>
            <BreadcrumbSeparator />
            {leaf(BANKING_LABELS[second ?? ''] ?? banking.nav.section)}
          </>
        ) : section === 'presupuesto' && second === 'modelos' ? (
          <>
            <Crumb to="/presupuesto" label={budget.nav.budget} />
            {leaf(budget.nav.models)}
          </>
        ) : section === 'metas' && second ? (
          <GoalCrumbs id={second} />
        ) : section === 'inversiones' && second ? (
          <InvestmentCrumbs id={second} />
        ) : section in PLAN_LABELS ? (
          leaf(PLAN_LABELS[section] ?? section)
        ) : section === 'contabilidad' ? (
          <>
            <BreadcrumbItem>{accounting.nav.section}</BreadcrumbItem>
            <BreadcrumbSeparator />
            {leaf(ACCOUNTING_LABELS[second ?? ''] ?? accounting.nav.section)}
          </>
        ) : section === 'plan-de-pago' ? (
          leaf(copy.nav.payoffPlan)
        ) : section === 'novedades' ? (
          leaf(shell.nav.releases)
        ) : section === 'guia' ? (
          leaf(guide.guide.title)
        ) : section !== 'deudas' ? null : second ? (
          <DebtCrumbs id={second} />
        ) : (
          leaf(copy.nav.debts)
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
