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
import { copy as budget } from '@/features/budget/copy'
import { copy as goals } from '@/features/goals/copy'
import { copy as investments } from '@/features/investments/copy'
import { copy as projection } from '@/features/projection/copy'
import { copy } from '@/features/debts/copy'
import { useDebt } from '@/features/debts/use-debts'

const ACCOUNTING_LABELS: Record<string, string> = {
  movimientos: accounting.nav.movements,
  asientos: accounting.nav.journal,
  cuentas: accounting.nav.accounts,
  categorias: accounting.nav.categories,
  mayor: accounting.nav.ledger,
  comprobacion: accounting.nav.trialBalance,
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

const DebtCrumbs = ({ id, leaf }: { id: string; leaf?: string }) => {
  const debt = useDebt(id)
  const name = debt.data?.name ?? '…'

  return (
    <>
      <Crumb to="/deudas" label={copy.nav.debts} />
      {leaf ? (
        <>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/deudas/$debtId"
                params={{ debtId: id }}
                className="inline-flex min-h-6 items-center"
              >
                {name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{leaf}</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      ) : (
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      )}
    </>
  )
}

// La miga se deriva de la ruta, no la declara cada pantalla: una pantalla que se olvide
// de declararla dejaría el encabezado mintiendo sobre dónde estás.
export const PageBreadcrumb = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [section, second, third] = pathname.split('/').filter(Boolean)

  if (!section) return null

  const leaf = (label: string) => (
    <BreadcrumbItem>
      <BreadcrumbPage>{label}</BreadcrumbPage>
    </BreadcrumbItem>
  )

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap whitespace-nowrap">
        {section in PLAN_LABELS ? (
          second === 'modelos' ? (
            <>
              <Crumb to="/presupuesto" label={budget.nav.budget} />
              {leaf(budget.nav.models)}
            </>
          ) : (
            leaf(PLAN_LABELS[section] ?? section)
          )
        ) : section === 'contabilidad' ? (
          <>
            <BreadcrumbItem>{accounting.nav.section}</BreadcrumbItem>
            <BreadcrumbSeparator />
            {leaf(ACCOUNTING_LABELS[second ?? ''] ?? accounting.nav.section)}
          </>
        ) : section !== 'deudas' ? (
          leaf(copy.nav.payoffPlan)
        ) : second === 'nueva' ? (
          <>
            <Crumb to="/deudas" label={copy.nav.debts} />
            {leaf(copy.form.createTitle)}
          </>
        ) : second ? (
          <DebtCrumbs id={second} leaf={third === 'editar' ? copy.detail.edit : undefined} />
        ) : (
          leaf(copy.nav.debts)
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
