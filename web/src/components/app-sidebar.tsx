import { Link } from '@tanstack/react-router'
import {
  Banknote,
  BookOpen,
  CalendarCheck,
  FolderTree,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  PiggyBank,
  Receipt,
  Scale,
  Tags,
  Target,
  Upload,
  Wallet,
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
import { copy as banking } from '@/features/banking/copy'
import { copy as budget } from '@/features/budget/copy'
import { copy } from '@/features/debts/copy'
import { copy as goals } from '@/features/goals/copy'
import { copy as investments } from '@/features/investments/copy'
import { copy as projection } from '@/features/projection/copy'
import { copy as shell } from '@/features/shell/copy'

// El panel va solo, encima de todo: es la pantalla que responde «¿y ahora qué?», y no
// pertenece a ninguna de las secciones porque las cruza a todas.
const navHome: NavItem[] = [{ title: shell.nav.dashboard, to: '/', icon: LayoutDashboard }]

const navMain: NavItem[] = [
  { title: copy.nav.debts, to: '/deudas', icon: Receipt },
  { title: copy.nav.payoffPlan, to: '/plan-de-pago', icon: ListOrdered },
]

// El plan: lo que todavía no pasó. La contabilidad registra; esto decide.
const navPlan: NavItem[] = [
  {
    title: budget.nav.budget,
    to: '/presupuesto',
    icon: Wallet,
    items: [
      { title: budget.nav.budget, to: '/presupuesto' },
      { title: budget.nav.models, to: '/presupuesto/modelos' },
    ],
  },
  { title: goals.goals.title, to: '/metas', icon: Target },
  { title: investments.investments.title, to: '/inversiones', icon: PiggyBank },
  { title: projection.projection.title, to: '/proyeccion', icon: LineChart },
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
      { title: accounting.nav.netWorth, to: '/contabilidad/patrimonio' },
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

// El banco es lo que entra desde afuera; la contabilidad, lo que Emilio anota. Separarlos en
// la navegación es separar las dos fuentes de verdad que la conciliación cruza.
const navBanking: NavItem[] = [
  { title: banking.nav.reconciliation, to: '/banco/conciliacion', icon: Scale },
  { title: banking.nav.import, to: '/banco/importar', icon: Upload },
  { title: banking.nav.accounts, to: '/banco/cuentas', icon: Banknote },
]

export const AppSidebar = () => (
  <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/">
              <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground">
                T
              </span>
              <span className="font-semibold tracking-tight">{shell.app.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <NavMain items={navHome} />
      <NavMain label={copy.nav.section} items={navMain} />
      <NavMain label={budget.nav.section} items={navPlan} />
      <NavMain label={accounting.nav.section} items={navAccounting} />
      <NavMain label={banking.nav.section} items={navBanking} />
    </SidebarContent>

    <SidebarFooter>
      <NavUser />
    </SidebarFooter>
  </Sidebar>
)
