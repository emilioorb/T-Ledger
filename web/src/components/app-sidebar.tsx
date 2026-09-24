import { etiquetas } from '@/features/shell/etiquetas'
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
import { copy as shell } from '@/features/shell/copy'

// El panel va solo, encima de todo: es la pantalla que responde «¿y ahora qué?», y no
// pertenece a ninguna de las secciones porque las cruza a todas.
const navHome: NavItem[] = [{ title: shell.nav.dashboard, to: '/tablero', icon: LayoutDashboard }]

const navMain: NavItem[] = [
  { title: etiquetas.dinero.debts, to: '/deudas', icon: Receipt },
  { title: etiquetas.dinero.payoffPlan, to: '/plan-de-pago', icon: ListOrdered },
]

// El plan: lo que todavía no pasó. La contabilidad registra; esto decide.
const navPlan: NavItem[] = [
  {
    title: etiquetas.plan.budget,
    to: '/presupuesto',
    icon: Wallet,
    items: [
      { title: etiquetas.plan.budget, to: '/presupuesto' },
      { title: etiquetas.plan.models, to: '/presupuesto/modelos' },
    ],
  },
  { title: etiquetas.metas, to: '/metas', icon: Target },
  { title: etiquetas.inversiones, to: '/inversiones', icon: PiggyBank },
  { title: etiquetas.proyeccion, to: '/proyeccion', icon: LineChart },
]

// Nueve vistas planas serían la barra lateral de quince ítems que la anti-referencia
// prohíbe. Los cuatro reportes cuelgan del mayor, que es por donde se entra a mirarlos.
const navAccounting: NavItem[] = [
  { title: etiquetas.contabilidad.movements, to: '/contabilidad/movimientos', icon: Receipt },
  { title: etiquetas.contabilidad.journal, to: '/contabilidad/asientos', icon: BookOpen },
  {
    title: etiquetas.contabilidad.reportsGroup,
    to: '/contabilidad/comprobacion',
    icon: Scale,
    items: [
      { title: etiquetas.contabilidad.netWorth, to: '/contabilidad/patrimonio' },
      { title: etiquetas.contabilidad.trialBalance, to: '/contabilidad/comprobacion' },
      { title: etiquetas.contabilidad.ledger, to: '/contabilidad/mayor' },
      { title: etiquetas.contabilidad.financialPosition, to: '/contabilidad/situacion' },
      { title: etiquetas.contabilidad.incomeStatement, to: '/contabilidad/resultados' },
    ],
  },
  { title: etiquetas.contabilidad.accounts, to: '/contabilidad/cuentas', icon: FolderTree },
  { title: etiquetas.contabilidad.categories, to: '/contabilidad/categorias', icon: Tags },
  { title: etiquetas.contabilidad.closing, to: '/contabilidad/cierre', icon: CalendarCheck },
]

// El banco es lo que entra desde afuera; la contabilidad, lo que Emilio anota. Separarlos en
// la navegación es separar las dos fuentes de verdad que la conciliación cruza.
const navBanking: NavItem[] = [
  { title: etiquetas.banco.reconciliation, to: '/banco/conciliacion', icon: Scale },
  { title: etiquetas.banco.import, to: '/banco/importar', icon: Upload },
  { title: etiquetas.banco.accounts, to: '/banco/cuentas', icon: Banknote },
]

export const AppSidebar = () => (
  <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/tablero">
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
      <NavMain label={etiquetas.dinero.section} items={navMain} />
      <NavMain label={etiquetas.plan.section} items={navPlan} />
      <NavMain label={etiquetas.contabilidad.section} items={navAccounting} />
      <NavMain label={etiquetas.banco.section} items={navBanking} />
    </SidebarContent>

    <SidebarFooter>
      <NavUser />
    </SidebarFooter>
  </Sidebar>
)
