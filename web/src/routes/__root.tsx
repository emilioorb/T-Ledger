import { useCallback, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Keyboard } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ExchangeRateIndicator } from '@/features/money/exchange-rate-indicator'
import { copy as shortcuts } from '@/features/shortcuts/copy'
import { PrimaryActionProvider } from '@/features/shortcuts/primary-action'
import { ShortcutsSheet } from '@/features/shortcuts/shortcuts-sheet'
import { useShortcuts } from '@/features/shortcuts/use-shortcuts'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const Shell = () => {
  const [helpOpen, setHelpOpen] = useState(false)
  const openHelp = useCallback(() => setHelpOpen(true), [])

  useShortcuts(openHelp)

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* min-w-0: sin esto el inset no puede encogerse por debajo del ancho mínimo de
          su contenido, y a 768 px el contenido empuja la página al desplazamiento lateral. */}
      <SidebarInset className="min-w-0">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" aria-label="Alternar la barra lateral" />
          <Separator
            orientation="vertical"
            className="mr-1 data-vertical:h-4 data-vertical:self-auto"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <PageBreadcrumb />
          </div>

          {/* Los atajos tienen que poder descubrirse sin saber que existen: por eso hay un
              botón, además de la tecla que lo abre. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={shortcuts.shortcuts.help}
                onClick={openHelp}
              >
                <Keyboard className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{shortcuts.shortcuts.help}</TooltipContent>
          </Tooltip>

          {/* Con la barra lateral abierta, el encabezado no da para las dos cosas hasta
              bien entrado el escritorio, y saber dónde estás gana contra la tasa del día,
              que vive completa en su propia pantalla. */}
          <div className="hidden shrink-0 lg:block">
            <ExchangeRateIndicator />
          </div>
        </header>
        <main className="w-full min-w-0 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </SidebarInset>

      <ShortcutsSheet open={helpOpen} onOpenChange={setHelpOpen} />
      <Toaster position="bottom-right" />
    </SidebarProvider>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <TooltipProvider delayDuration={300}>
      <PrimaryActionProvider>
        <Shell />
      </PrimaryActionProvider>
    </TooltipProvider>
  ),
})
