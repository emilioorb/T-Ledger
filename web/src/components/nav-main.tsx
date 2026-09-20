import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, type LucideIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

export interface NavItem {
  title: string
  to: string
  icon: LucideIcon
  items?: { title: string; to: string }[]
}

interface Props {
  label: string
  items: NavItem[]
}

export const NavMain = ({ label, items }: Props) => (
  <SidebarGroup>
    <SidebarGroupLabel>{label}</SidebarGroupLabel>
    <SidebarMenu>
      {items.map((item) => (
        <Collapsible key={item.to} asChild defaultOpen>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={item.title}>
              <Link to={item.to} activeProps={{ 'data-active': true }}>
                <item.icon aria-hidden="true" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>

            {/* El submenú solo existe si la ruta lo tiene. Hoy ninguna: la estructura
                queda lista para cuando la fase 2 sume presupuesto, metas e inversiones. */}
            {item.items?.length ? (
              <>
                <CollapsibleTrigger asChild>
                  <SidebarMenuAction className="data-[state=open]:rotate-90">
                    <ChevronRightIcon aria-hidden="true" />
                    <span className="sr-only">Desplegar {item.title}</span>
                  </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((sub) => (
                      <SidebarMenuSubItem key={sub.to}>
                        <SidebarMenuSubButton asChild>
                          <Link to={sub.to} activeProps={{ 'data-active': true }}>
                            <span>{sub.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </>
            ) : null}
          </SidebarMenuItem>
        </Collapsible>
      ))}
    </SidebarMenu>
  </SidebarGroup>
)
