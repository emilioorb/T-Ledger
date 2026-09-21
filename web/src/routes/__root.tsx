import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ExchangeRateIndicator } from '@/features/money/exchange-rate-indicator'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <TooltipProvider delayDuration={300}>
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
        <Toaster position="bottom-right" />
      </SidebarProvider>
    </TooltipProvider>
  ),
})
