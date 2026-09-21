import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  CalendarCheck,
  FolderTree,
  ListOrdered,
  Receipt,
  Scale,
  Tags,
} from 'lucide-react'
import { NavMain, type NavItem } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { copy as accounting } from '@/features/accounting/copy'
import { copy } from '@/features/debts/copy'

const navMain: NavItem[] = [
  { title: copy.nav.debts, to: '/deudas', icon: Receipt },
  { title: copy.nav.payoffPlan, to: '/plan-de-pago', icon: ListOrdered },
]

// Nueve vistas planas serían la barra lateral de quince ítems que la anti-referencia
// prohíbe. Los cuatro reportes cuelgan del mayor, que es por donde se entra a mirarlos.
const navAccounting: NavItem[] = [
  { title: accounting.nav.movements, to: '/contabilidad/movimientos', icon: Receipt },
  { title: accounting.nav.journal, to: '/contabilidad/asientos', icon: BookOpen },
  {
    title: accounting.nav.reportsGroup,
    to: '/contabilidad/comprobacion',
    icon: Scale,
    items: [
      { title: accounting.nav.trialBalance, to: '/contabilidad/comprobacion' },
      { title: accounting.nav.ledger, to: '/contabilidad/mayor' },
      { title: accounting.nav.financialPosition, to: '/contabilidad/situacion' },
      { title: accounting.nav.incomeStatement, to: '/contabilidad/resultados' },
    ],
  },
  { title: accounting.nav.accounts, to: '/contabilidad/cuentas', icon: FolderTree },
  { title: accounting.nav.categories, to: '/contabilidad/categorias', icon: Tags },
  { title: accounting.nav.closing, to: '/contabilidad/cierre', icon: CalendarCheck },
]

export const AppSidebar = () => (
  <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/">
              <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground">
                F
              </span>
              <span className="font-semibold tracking-tight">Finanzas</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <NavMain label={copy.nav.section} items={navMain} />
      <NavMain label={accounting.nav.section} items={navAccounting} />
    </SidebarContent>

    <SidebarFooter>
      <NavUser name={copy.nav.user} subtitle={copy.nav.userSubtitle} />
    </SidebarFooter>
  </Sidebar>
)
