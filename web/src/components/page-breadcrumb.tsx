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

const DebtCrumb = ({ id }: { id: string }) => {
  const debt = useDebt(id)
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link to="/deudas" className="inline-flex min-h-6 items-center">
            {copy.nav.debts}
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>{debt.data?.name ?? '...'}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

// La miga se deriva de la ruta, no la declara cada pantalla: una pantalla que se olvide
// de declararla dejaría el encabezado mintiendo sobre dónde estás.
export const PageBreadcrumb = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const segments = pathname.split('/').filter(Boolean)
  const [section, id] = segments

  if (!section) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {section === 'deudas' && id ? (
          <DebtCrumb id={id} />
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>
              {section === 'deudas' ? copy.nav.debts : copy.nav.payoffPlan}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
