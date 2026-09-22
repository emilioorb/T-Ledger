import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/identity/auth-client'
import { copy as shell } from '@/features/shell/copy'
import { temaDeEntrada } from '@/lib/theme'
import { CambioDeTema } from './cambio-de-tema'
import { cn } from '@/lib/utils'
import { CuentaT } from './cuenta-t'
import { copy } from './copy'
import { PATA, Tramo } from './pata'
import { PedirAcceso } from './pedir-acceso'

// La única pantalla pública que no pide nada.
//
// Pinta primero y pregunta después: la guarda de la raíz no consulta la sesión en las rutas
// públicas, así que el visitante anónimo —que es para quien existe esta página— no espera una
// respuesta que en su caso siempre es «no». Si resulta que hay sesión, recién ahí salta al
// tablero, y con `replace` para no dejar la landing en el historial de quien ya entró.
export const Landing = () => {
  const navegar = useNavigate()
  const { data: sesion } = useSession()

  // El tema y el campo de puntos los pone `MarcoPublico`. El botón cambia el tema de las tres
  // pantallas de antes de entrar: `/entrar` y `/crear-cuenta` siguen lo que se elija acá, y la
  // preferencia de adentro de la app no se toca.
  const tema = temaDeEntrada.usar()

  useEffect(() => {
    if (sesion) void navegar({ to: '/tablero', replace: true })
  }, [navegar, sesion])

  return (
    <main className="flex min-h-dvh flex-col">
      <CambioDeTema tema={tema} alCambiar={temaDeEntrada.poner} />

      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-10 sm:py-5">
        {/* En monoespaciada, como en la pantalla de entrar: el nombre viene de la cuenta T, y
            dos columnas solo se leen derechas cuando alinean. */}
        <span className="font-mono text-lg font-medium tracking-tight">{shell.app.name}</span>

        <nav className="flex items-center gap-1 sm:gap-2">
          <PedirAcceso />
          <Button size="sm" asChild>
            <Link to="/entrar">
              {copy.entrar}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* El travesaño de la T, de borde a borde: es la única regla gruesa de la página. */}
      <div aria-hidden="true" className="border-t-2 border-foreground/80" />

      {/* La página entera es la cuenta. La pata baja del travesaño hasta el pie y parte la
          pantalla en dos mitades reales, en tramos: lo que tiene dos lados la lleva en su
          borde, y lo que cruza de lado a lado —las frases, el cierre— la corta. */}
      <div className="flex flex-1 flex-col">
        <Tramo className="min-h-[clamp(1rem,4dvh,3rem)] flex-1" />

        {/* Partido por la pata: lo tuyo de un lado, lo del libro del otro. */}
        <h1 className="grid grid-cols-2 text-[clamp(1.6rem,min(6vw,8.5dvh),5rem)] leading-[0.95] font-semibold tracking-tight">
          <span className={cn('pr-3 text-right text-balance sm:pr-6 md:pr-8', PATA)}>
            {copy.titular.tuyo}
          </span>{' '}
          <span className="pl-3 text-balance sm:pl-6 md:pl-8">{copy.titular.libro}</span>
        </h1>

        <Tramo className="h-[clamp(1rem,4dvh,3rem)]" />
        <CuentaT />
        <Tramo className="min-h-[clamp(1rem,4dvh,3rem)] flex-1" />

        {/* Los dos rótulos se corren lo mismo hacia adentro: a la derecha flota el botón del
            tema, y correr solo uno rompería la simetría de la T. */}
        <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4 text-xs text-muted-foreground sm:px-10 sm:pb-5">
          <span className="pl-11 tracking-wide uppercase sm:pl-12" aria-hidden="true">
            {copy.debe}
          </span>
          <span className="flex flex-wrap items-center justify-center gap-2 px-1.5 py-1 sm:px-3">
            <span>
              © <span className="num">{__BUILD_YEAR__}</span>{' '}
              <span className="text-foreground">{shell.app.name}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="num">v{__APP_VERSION__}</span>
          </span>
          <span className="pr-11 text-right tracking-wide uppercase sm:pr-12" aria-hidden="true">
            {copy.haber}
          </span>
        </footer>
      </div>
    </main>
  )
}
