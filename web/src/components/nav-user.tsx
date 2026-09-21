import { Link } from '@tanstack/react-router'
import { ChevronsUpDownIcon, CompassIcon, MoonIcon, ScrollTextIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { copy as shell } from '@/features/shell/copy'
import { copy as guide } from '@/features/shell/guide-copy'
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

            <DropdownMenuItem asChild>
              <Link to="/guia">
                <CompassIcon aria-hidden="true" />
                {guide.guide.title}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to="/novedades">
                <ScrollTextIcon aria-hidden="true" />
                {shell.nav.releases}
              </Link>
            </DropdownMenuItem>

            {/* El tema va último y separado: es una preferencia de la aplicación, no un
                lugar al que se va. Una sola fila, porque la elección es binaria y el rótulo
                dice a qué se cambia, no dónde se está. */}
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
              {theme === 'dark' ? copy.nav.lightTheme : copy.nav.darkTheme}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
