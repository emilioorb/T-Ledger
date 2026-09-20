import { Link } from '@tanstack/react-router'
import { ListOrdered, Moon, Receipt, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavMain, type NavItem } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { copy } from '@/features/debts/copy'
import { applyTheme, readTheme, type Theme } from '@/lib/theme'

const navMain: NavItem[] = [
  { title: copy.nav.debts, to: '/deudas', icon: Receipt },
  { title: copy.nav.payoffPlan, to: '/plan-de-pago', icon: ListOrdered },
]

const ThemeItem = () => {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="sm"
        tooltip={next === 'light' ? copy.nav.lightTheme : copy.nav.darkTheme}
        onClick={() => setTheme(next)}
      >
        <Icon aria-hidden="true" />
        <span>{next === 'light' ? copy.nav.lightTheme : copy.nav.darkTheme}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

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
      {/* La navegación secundaria del block, anclada abajo: utilidades, no destinos. */}
      <NavSecondary className="mt-auto">
        <ThemeItem />
      </NavSecondary>
    </SidebarContent>
  </Sidebar>
)
