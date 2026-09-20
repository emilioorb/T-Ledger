import { Link, useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { copy } from '@/features/debts/copy'
import { useDebt } from '@/features/debts/use-debts'

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
      <BreadcrumbList>
        {section !== 'deudas' ? (
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
