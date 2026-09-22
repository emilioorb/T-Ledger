import { useEffect, useLayoutEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/identity/auth-client'
import { copy as shell } from '@/features/shell/copy'
import { forceTheme } from '@/lib/theme'
import { CuentaT } from './cuenta-t'
import { copy } from './copy'
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

  // Papel blanco con tinta negra, sea cual sea la preferencia guardada, igual que `/entrar` y
  // `/crear-cuenta`: las tres son la misma superficie, y el botón de entrar lleva de una a la
  // otra. Con la landing en oscuro, tocarlo encandila.
  //
  // `useLayoutEffect` y no `useEffect`, por lo mismo que en `MarcoDeIdentidad`: en un efecto
  // normal la pantalla asoma un cuadro con el tema viejo y da un parpadeo. `forceTheme`
  // devuelve la limpieza que restaura la preferencia al salir.
  useLayoutEffect(() => forceTheme('light'), [])

  useEffect(() => {
    if (sesion) void navegar({ to: '/tablero', replace: true })
  }, [navegar, sesion])

  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 py-5 sm:px-10">
      <header className="flex items-center justify-between gap-4">
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

      {/* El travesaño de la T, de borde a borde: es la única regla gruesa de la página, y lo
          que la hace leer como una cuenta T y no como una cabecera con línea abajo. */}
      <div aria-hidden="true" className="-mx-6 mt-5 border-t-2 border-foreground/70 sm:-mx-10" />

      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="mx-auto max-w-[24ch] text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {copy.titular}
        </h1>
        <p className="mx-auto mt-3 max-w-[50ch] text-center text-sm text-muted-foreground">
          {copy.bajada}
        </p>

        <CuentaT className="mt-10 sm:mt-12" />

        <p className="mt-6 text-center text-sm text-muted-foreground">{copy.cierre}</p>
      </div>

      {/* El mismo pie que adentro y que en la pantalla de entrar: el símbolo, el año y el
          nombre juntos, y la versión después del separador, que es lo que cambia. */}
      <footer className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>
          © <span className="num">{__BUILD_YEAR__}</span>{' '}
          <span className="text-foreground">{shell.app.name}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span className="num">v{__APP_VERSION__}</span>
      </footer>
    </main>
  )
}
