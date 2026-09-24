import { etiquetas } from '@/features/shell/etiquetas'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { copy as shell } from '@/features/shell/copy'
import { ACCOUNTING_LABELS, BANKING_LABELS, PLAN_LABELS } from '@/features/shell/page-title'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { today } from '@/lib/dates'

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

// El nombre de lo que se está viendo, con la misma clave de caché que usa su pantalla: la miga lo
// encuentra ahí sin pedirlo dos veces. No importa los hooks de cada pantalla a propósito: la miga
// está en el bundle de entrada, y esos módulos traían todas sus mutaciones a la portada.
const useNombre = (queryKey: readonly unknown[], ruta: string) =>
  useQuery({ queryKey, queryFn: () => apiFetch<{ name: string }>(ruta), enabled: ruta !== '' })

const DebtCrumbs = ({ id }: { id: string }) => {
  const debt = useNombre(queryKeys.debts.detail(id), `/debts/${id}`)

  return (
    <>
      <Crumb to="/deudas" label={etiquetas.dinero.debts} />
      <BreadcrumbItem>
        <BreadcrumbPage>{debt.data?.name ?? '…'}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

const GoalCrumbs = ({ id }: { id: string }) => {
  const goal = useNombre(queryKeys.goals.detail(id), `/goals/${id}`)
  return (
    <>
      <Crumb to="/metas" label={etiquetas.metas} />
      <BreadcrumbItem>
        <BreadcrumbPage>{goal.data?.name ?? '…'}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

const InvestmentCrumbs = ({ id }: { id: string }) => {
  const hoy = today()
  const investment = useNombre(queryKeys.investments.projection(id, hoy), `/investments/${id}/projection?at=${hoy}`)
  return (
    <>
      <Crumb to="/inversiones" label={etiquetas.inversiones} />
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
        <BreadcrumbList>{leaf(etiquetas.tablero)}</BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap whitespace-nowrap">
        {section === 'banco' ? (
          <>
            <BreadcrumbItem>{etiquetas.banco.section}</BreadcrumbItem>
            <BreadcrumbSeparator />
            {leaf(BANKING_LABELS[second ?? ''] ?? etiquetas.banco.section)}
          </>
        ) : section === 'presupuesto' && second === 'modelos' ? (
          <>
            <Crumb to="/presupuesto" label={etiquetas.plan.budget} />
            {leaf(etiquetas.plan.models)}
          </>
        ) : section === 'metas' && second ? (
          <GoalCrumbs id={second} />
        ) : section === 'inversiones' && second ? (
          <InvestmentCrumbs id={second} />
        ) : section in PLAN_LABELS ? (
          leaf(PLAN_LABELS[section] ?? section)
        ) : section === 'contabilidad' ? (
          <>
            <BreadcrumbItem>{etiquetas.contabilidad.section}</BreadcrumbItem>
            <BreadcrumbSeparator />
            {leaf(ACCOUNTING_LABELS[second ?? ''] ?? etiquetas.contabilidad.section)}
          </>
        ) : section === 'plan-de-pago' ? (
          leaf(etiquetas.dinero.payoffPlan)
        ) : section === 'novedades' ? (
          leaf(shell.nav.releases)
        ) : section === 'guia' ? (
          leaf(etiquetas.guia)
        ) : section !== 'deudas' ? null : second ? (
          <DebtCrumbs id={second} />
        ) : (
          leaf(etiquetas.dinero.debts)
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
