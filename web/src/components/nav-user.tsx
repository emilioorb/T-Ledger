import { ChevronsUpDownIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { copy } from '@/features/debts/copy'
import { applyTheme, readTheme, type Theme } from '@/lib/theme'

interface Props {
  name: string
  subtitle: string
}

const Identity = ({ name, subtitle }: Props) => (
  <>
    <Avatar className="size-8 rounded-md after:rounded-md">
      <AvatarFallback className="rounded-md text-xs font-semibold">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="grid flex-1 text-left leading-tight">
      <span className="truncate text-sm font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
    </div>
  </>
)

export const NavUser = ({ name, subtitle }: Props) => {
  const { isMobile } = useSidebar()
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Identity name={name} subtitle={subtitle} />
              <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <Identity name={name} subtitle={subtitle} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Lo único que hay para elegir hoy. No se inventan cuenta, facturación ni
                notificaciones: este producto no tiene ninguna de las tres. */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {copy.nav.theme}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <DropdownMenuRadioItem value="dark">
                <MoonIcon aria-hidden="true" />
                {copy.nav.darkTheme}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                <SunIcon aria-hidden="true" />
                {copy.nav.lightTheme}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
