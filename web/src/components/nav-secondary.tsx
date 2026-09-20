import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@/components/ui/sidebar'

type Props = { children: ReactNode } & ComponentPropsWithoutRef<typeof SidebarGroup>

export const NavSecondary = ({ children, ...props }: Props) => (
  <SidebarGroup {...props}>
    <SidebarGroupContent>
      <SidebarMenu>{children}</SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)
