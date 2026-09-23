import { useEffect } from 'react'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Bloub } from '@/features/shell/bloub'
import { reportar } from '@/lib/observability'
import { copy } from './copy'
import { esFaltaDeRed, useEnLinea } from './en-linea'

// Lo que el router muestra cuando una pantalla no puede cargar. El caso que lo motivó: la app
// instalada que se abre sin red. La raíz le pregunta la sesión al servidor antes de pintar, y
// ese fetch sin red lanza en vez de responder; sin esto quedaba el «Something went wrong!» del
// router, en inglés y sin salida.
//
// `invalidate` y no `reset`: reset limpia el error pero no vuelve a correr el beforeLoad, que
// es lo que falló.
export const ErrorDeCarga = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  const enLinea = useEnLinea()
  const sinRed = !enLinea || esFaltaDeRed(error)

  // Reintenta cuando la red vuelve, una vez por cada vuelta, y no al montar: con la red
  // encendida pero sin respuesta, reintentar al montar remontaba esta pantalla con el error
  // nuevo y volvía a reintentar, en un bucle contra el servidor.
  useEffect(() => {
    if (!sinRed) return
    const reintentar = () => void router.invalidate()
    window.addEventListener('online', reintentar)
    return () => window.removeEventListener('online', reintentar)
  }, [sinRed, router])

  // Una red caída no es un bug: reportarla solo metería ruido.
  useEffect(() => {
    if (!sinRed) reportar(error)
  }, [sinRed, error])

  const { titulo, texto } = sinRed ? copy.pantallaSinConexion : copy.pantallaConError

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <Bloub gesto={sinRed ? 'adormilado' : 'confundido'} className="size-16" />
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      <p className="max-w-[48ch] text-sm text-muted-foreground">{texto}</p>
      {enLinea && (
        <Button size="sm" onClick={() => void router.invalidate()}>
          {copy.pantallaConError.reintentar}
        </Button>
      )}
    </main>
  )
}
