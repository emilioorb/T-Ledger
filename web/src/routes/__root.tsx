import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { Keyboard } from 'lucide-react'
import { AppFooter } from '@/components/app-footer'
import { DocumentTitle } from '@/components/document-title'
import { AppSidebar } from '@/components/app-sidebar'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ExchangeRateIndicator } from '@/features/money/exchange-rate-indicator'
import { auth } from '@/features/identity/auth-client'
import { useAsegurarLibroActivo } from '@/features/identity/libro-activo'
import { recuerdoDeSesion } from '@/features/identity/recuerdo-de-sesion'
import { MarcoPublico } from '@/features/identity/marco-publico'
import { AvisoDeVersion } from '@/features/pwa/aviso-de-version'
import { AvisoSinConexion } from '@/features/pwa/aviso-sin-conexion'
import { ErrorDeCarga } from '@/features/pwa/error-de-carga'
import { VigilanteDeSesion } from '@/features/identity/vigilante-de-sesion'
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
  // Del lado privado y no en la raíz: sin sesión no hay libro que elegir.
  useAsegurarLibroActivo()

  const [helpOpen, setHelpOpen] = useState(false)
  const alternarAyuda = useCallback(() => setHelpOpen((abierta) => !abierta), [])
  const content = useRef<HTMLElement>(null)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const rutaAnterior = useRef(pathname)

  useShortcuts(helpOpen, alternarAyuda)

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
                onClick={alternarAyuda}
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
    </SidebarProvider>
  )
}

// Las pantallas donde todavía no sos nadie. No llevan barra lateral —no hay a dónde navegar
// sin sesión— y son las únicas a las que se entra sin ella.
// La landing entra acá por dos motivos a la vez: no pide sesión, y no lleva barra lateral.
// `beforeLoad` la compara contra el pathname y el componente contra el `routeId`, y para la
// raíz las dos cosas son '/'.
const PUBLICAS = ['/', '/entrar', '/crear-cuenta']

const esPublica = (ruta: string) => PUBLICAS.includes(ruta)

// Medio minuto. La sesión se preguntaba en **cada** navegación —cuatro clics en la barra
// lateral, cuatro viajes al servidor, y cada uno bloqueando la pantalla antes de pintar nada—,
// que es de dónde salía el medio segundo de espera después de apretar Entrar.
//
// El precio de cachearla es que una sesión vencida del lado del servidor tarda hasta este rato
// en notarse, y mientras tanto las consultas devuelven 401. Treinta segundos es poco para que
// eso moleste y mucho para no repetir la pregunta en cada clic.
//
// Los dos lugares donde se entra y se sale vacían la caché entera (`queryClient.clear()`), así
// que la invalidación en el momento que importa ya está: acá no hace falta acordarse de nada.
const VIGENCIA_DE_LA_SESION = 30_000

const SESION = ['sesion'] as const

const Raiz = () => {
  // Se pregunta por los **matches** y no por `location.pathname`, aunque el pathname sea más
  // directo de leer. El `Outlet` de abajo renderiza los matches; el pathname cambia apenas
  // arranca la navegación, mientras el match del destino todavía está resolviendo su
  // `beforeLoad` —que acá pregunta la sesión al servidor y tarda—. En esa ventana los dos no
  // coinciden, y como el layout se elegía con uno y el contenido con el otro, al entrar se
  // veían **las dos cosas a la vez**: la barra lateral del tablero alrededor del formulario
  // de ingreso, medida en 720 ms. Preguntando por lo mismo que se renderiza, no pueden
  // diferir.
  const enPublica = useRouterState({
    select: (estado) => estado.matches.some((match) => esPublica(match.routeId)),
  })

  // Los avisos y el Toaster van una sola vez, afuera de las dos ramas: con un Toaster en cada
  // lado, entrar o salir de la sesión montaba uno nuevo y vacío, y el aviso de versión nueva
  // que ya estaba en pantalla desaparecía hasta la próxima recarga.
  return (
    <TooltipProvider delayDuration={300}>
      <AvisoDeVersion />
      <AvisoSinConexion />
      {enPublica ? (
        <>
          {/* También acá: el título de la pestaña es lo primero que lee un lector de
              pantalla al cambiar de ruta, y sin esto las pantallas sin sesión heredaban el
              título de donde vinieras. */}
          <DocumentTitle />
          <MarcoPublico>
            <Outlet />
          </MarcoPublico>
        </>
      ) : (
        // El vigilante va del lado privado y no envolviendo todo: en la pantalla de entrar
        // no hay sesión que cerrar, y un reloj corriendo ahí sería un temporizador vigilando
        // a nadie.
        <PrimaryActionProvider>
          <Shell />
          <VigilanteDeSesion />
        </PrimaryActionProvider>
      )}
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Sin sesión no se entra a ningún lado. Antes la app dejaba pasar y cada consulta devolvía
  // 401: el resultado era el esqueleto completo con todos los paneles rotos, que es peor que
  // decir «entrá» de una.
  //
  // El destino viaja en `redirigirA` para volver ahí después de entrar, en vez de dejar a
  // todo el mundo en el tablero cuando venía siguiendo un enlace a otra pantalla.
  beforeLoad: async ({ location, context }) => {
    // `ensureQueryData` y no `fetchQuery`: si la respuesta sigue fresca la devuelve sin tocar
    // la red, que es justamente el punto.
    const preguntarSesion = async () => {
      const sesion = await context.queryClient.ensureQueryData({
        queryKey: SESION,
        queryFn: async () => (await auth.getSession()).data,
        staleTime: VIGENCIA_DE_LA_SESION,
      })
      if (sesion) recuerdoDeSesion.anotar()
      else recuerdoDeSesion.olvidar()
      return sesion
    }

    // La landing se pinta sin preguntar, para no hacer esperar a quien nunca entró. Pero a quien
    // vuelve con la sesión abierta eso le mostraba la landing un instante antes de saltar al
    // tablero. Si este navegador tuvo sesión, se pregunta antes de pintar.
    if (location.pathname === '/') {
      if (recuerdoDeSesion.hubo() && (await preguntarSesion())) throw redirect({ to: '/tablero' })
      return
    }

    if (esPublica(location.pathname)) return

    if (!(await preguntarSesion())) {
      throw redirect({ to: '/entrar', search: { redirigirA: location.href } })
    }
  },
  errorComponent: (props) => <ErrorDeCarga {...props} pantallaCompleta />,
  component: Raiz,
})
