import { useEffect, useRef } from 'react'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'
import { ErrorDeRed } from '@/lib/api'
import { reportar } from '@/lib/observability'
import { copy } from './copy'
import { useEnLinea } from './en-linea'

type Causa = 'sinRed' | 'sinServidor' | 'bug'

const PANTALLAS: Record<Causa, { titulo: string; texto: string; gesto: NombreDeGesto }> = {
  sinRed: { ...copy.pantallaSinConexion, gesto: 'adormilado' },
  sinServidor: { ...copy.pantallaSinServidor, gesto: 'confundido' },
  bug: { ...copy.pantallaConError, gesto: 'confundido' },
}

const causaDe = (error: unknown, enLinea: boolean): Causa => {
  if (!enLinea) return 'sinRed'
  return error instanceof ErrorDeRed ? 'sinServidor' : 'bug'
}

interface Props extends ErrorComponentProps {
  // Solo la raíz: si falla ella no hay nada alrededor, así que la pantalla es la página
  // entera. Dentro de la app ya hay un <main> y la barra lateral; ahí va una sección más.
  pantallaCompleta?: boolean
}

// Lo que el router muestra cuando una pantalla no puede cargar. El caso que lo motivó: la app
// instalada que se abre sin red. La raíz le pregunta la sesión al servidor antes de pintar y,
// sin esto, quedaba el «Something went wrong!» del router, en inglés y sin salida.
//
// `invalidate` y no `reset`: reset limpia el error pero no vuelve a correr el beforeLoad, que
// es lo que falló.
export const ErrorDeCarga = ({ error, pantallaCompleta = false }: Props) => {
  const router = useRouter()
  const enLinea = useEnLinea()
  const causa = causaDe(error, enLinea)
  const { titulo, texto, gesto } = PANTALLAS[causa]
  const reportado = useRef<unknown>(null)

  // Reintenta cuando la red vuelve —el paso de sin red a con red—, una vez por cada vuelta, y
  // no al montar: con la red encendida pero sin respuesta, reintentar al montar remontaba esta
  // pantalla con el error nuevo y volvía a reintentar, en un bucle contra el servidor.
  //
  // Se mira el cambio de `enLinea` y no el evento `online` con un listener propio: el hook se
  // entera primero del mismo evento, re-renderiza, y la limpieza del efecto sacaba el listener
  // antes de que el evento le llegara. Medido en Chrome: la pantalla no volvía nunca.
  const estabaSinRed = useRef(!enLinea)
  useEffect(() => {
    if (!enLinea) {
      estabaSinRed.current = true
      return
    }
    if (!estabaSinRed.current) return
    estabaSinRed.current = false
    void router.invalidate()
  }, [enLinea, router])

  // Solo los bugs, y cada uno una vez: una red caída no es un error de la app.
  useEffect(() => {
    if (causa !== 'bug' || reportado.current === error) return
    reportado.current = error
    reportar(error)
  }, [causa, error])

  const Contenedor = pantallaCompleta ? 'main' : 'section'

  return (
    <Contenedor
      className={
        pantallaCompleta
          ? 'flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground'
          : 'flex flex-col items-center gap-4 py-16 text-center'
      }
    >
      <Bloub gesto={gesto} className="size-16" />
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      <p className="max-w-[48ch] text-sm text-muted-foreground">{texto}</p>
      {causa !== 'sinRed' && (
        <Button size="sm" onClick={() => void router.invalidate()}>
          {copy.reintentar}
        </Button>
      )}
    </Contenedor>
  )
}
