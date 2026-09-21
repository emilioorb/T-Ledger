import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext, useRouterState } from '@tanstack/react-router'
import { Keyboard } from 'lucide-react'
import { AppFooter } from '@/components/app-footer'
import { DocumentTitle } from '@/components/document-title'
import { AppSidebar } from '@/components/app-sidebar'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ExchangeRateIndicator } from '@/features/money/exchange-rate-indicator'
import { copy as shell } from '@/features/shell/copy'
import { copy as shortcuts } from '@/features/shortcuts/copy'
import { PrimaryActionProvider } from '@/features/shortcuts/primary-action'
import { ShortcutsSheet } from '@/features/shortcuts/shortcuts-sheet'
import { useShortcuts } from '@/features/shortcuts/use-shortcuts'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const CONTENT_ID = 'contenido'

const Shell = () => {
  const [helpOpen, setHelpOpen] = useState(false)
  const openHelp = useCallback(() => setHelpOpen(true), [])
  const content = useRef<HTMLElement>(null)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const rutaAnterior = useRef(pathname)

  useShortcuts(openHelp)

  // Al cambiar de pantalla el foco se queda donde estaba, así que el siguiente Tab vuelve a
  // recorrer los veinte enlaces de la barra antes de llegar al contenido. Se mueve al
  // contenido, que además hace que el lector de pantalla anuncie la pantalla nueva.
  //
  // La guarda compara rutas y no un booleano de «primera vez»: en desarrollo React corre los
  // efectos dos veces, y con un booleano la segunda pasada robaba el foco en la carga inicial,
  // dejando el enlace de saltar al contenido fuera del alcance del primer tabulador.
  useEffect(() => {
    if (rutaAnterior.current === pathname) return
    rutaAnterior.current = pathname
    content.current?.focus()
  }, [pathname])

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <DocumentTitle />

      {/* El primer tabulador de la página salta el menú entero. Invisible hasta que recibe
          el foco, que es cuando hace falta. */}
      <a
        href={`#${CONTENT_ID}`}
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {shell.nav.skipToContent}
      </a>

      <AppSidebar />
      {/* min-w-0: sin esto el inset no puede encogerse por debajo del ancho mínimo de
          su contenido, y a 768 px el contenido empuja la página al desplazamiento lateral. */}
      {/* min-h-0: sin esto el inset se estira al alto de su contenido y el pie se va con él. */}
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" aria-label={shell.nav.toggleSidebar} />
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
        {/* El contenedor de las pantallas se declara `@container`: los breakpoints de
            Tailwind miden la ventana, pero el ancho que una fila tiene de verdad lo decide
            la barra lateral. A 768 px el contenido mide 489 y a 1024 mide 745, así que una
            regla en `sm:` se encendía justo cuando el espacio se achicaba. Las pantallas
            usan `@sm:`, `@lg:` y demás para mirar este ancho y no el del navegador. */}
        {/* El <main> envuelve solo las pantallas: el encabezado y el pie quedan afuera para
            conservar sus roles. `tabIndex={-1}` lo hace enfocable por programa sin meterlo en
            el recorrido del tabulador. */}
        <main
          id={CONTENT_ID}
          ref={content}
          tabIndex={-1}
          className="@container w-full min-w-0 flex-1 overflow-y-auto px-4 py-6 outline-none md:px-6"
        >
          <Outlet />
        </main>

        <AppFooter />
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
