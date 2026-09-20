import { Link } from '@tanstack/react-router'
import { ListOrdered, Receipt } from 'lucide-react'
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
import { copy } from '@/features/debts/copy'

const navMain: NavItem[] = [
  { title: copy.nav.debts, to: '/deudas', icon: Receipt },
  { title: copy.nav.payoffPlan, to: '/plan-de-pago', icon: ListOrdered },
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
    </SidebarContent>

    <SidebarFooter>
      <NavUser name={copy.nav.user} subtitle={copy.nav.userSubtitle} />
    </SidebarFooter>
  </Sidebar>
)
