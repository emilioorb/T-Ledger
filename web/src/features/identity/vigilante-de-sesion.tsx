import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { queryClient } from '@/router'
import { olvidarQuienEra } from '@/lib/observability'
import { signOut } from './auth-client'
import { recuerdoDeSesion } from './recuerdo-de-sesion'
import { copy } from './copy'
import { faltaParaCerrar, pasoDeSesion } from './inactividad'

// Un pulso por segundo. Es una cuenta regresiva a la vista: más lento se ve saltar, y más
// rápido no cambia nada que alguien pueda notar.
const PULSO = 1_000

const SENALES_DE_VIDA = ['pointerdown', 'keydown'] as const

// El canal entre pestañas. Dos ventanas del mismo libro son la misma persona: si trabaja en
// una, la otra no tiene por qué cerrarse sola.
const CANAL = 't-account-ledger-sesion'

type Aviso = { tipo: 'actividad' | 'cerrada' }

const formatearCuenta = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  const minutos = Math.floor(total / 60)
  const segundos = total % 60
  return `${minutos}:${String(segundos).padStart(2, '0')}`
}

// Cierra la sesión sola cuando nadie toca nada. No es una comodidad: es la única defensa de un
// libro de plata abierto en una computadora que su dueño dejó sin bloquear. Avisa dos minutos
// antes, porque cerrarla de golpe en medio de un asiento a medio escribir sería peor que el
// riesgo que evita.
export const VigilanteDeSesion = () => {
  const navegar = useNavigate()
  // El reloj se siembra al montar y no durante el render: leer la hora mientras se renderiza
  // no es puro, y React lo prohíbe con razón.
  const ultimaActividad = useRef(0)
  const avisando = useRef(false)
  // Guarda propia para que el cierre ocurra una sola vez: el pulso sigue latiendo mientras la
  // salida viaja por la red, y sin esto se dispararían varias.
  const yaCerro = useRef(false)
  const canal = useRef<BroadcastChannel | null>(null)
  const [restante, setRestante] = useState<number | null>(null)

  const avisarPares = useCallback((aviso: Aviso) => canal.current?.postMessage(aviso), [])

  const volverAEmpezar = useCallback(() => {
    ultimaActividad.current = Date.now()
    avisando.current = false
    setRestante(null)
  }, [])

  const cerrar = useCallback(async () => {
    if (yaCerro.current) return
    yaCerro.current = true
    avisarPares({ tipo: 'cerrada' })

    // El mismo final que cerrar sesión a mano, y por los mismos motivos: la caché guarda los
    // saldos y los movimientos de quien acaba de irse, y Sentry deja de saber quién era.
    await signOut().catch(() => undefined)
    queryClient.clear()
    olvidarQuienEra()
    recuerdoDeSesion.olvidar()
    void navegar({ to: '/entrar', search: { motivo: 'inactividad' } })
  }, [avisarPares, navegar])

  const seguirAca = useCallback(() => {
    volverAEmpezar()
    avisarPares({ tipo: 'actividad' })
  }, [avisarPares, volverAEmpezar])

  useEffect(() => {
    const marcar = () => {
      // Con el aviso abierto, mover el mouse no cuenta. La pregunta es «¿seguís ahí?» y
      // merece una respuesta, no un roce del trackpad al pasar por el escritorio.
      if (avisando.current) return
      ultimaActividad.current = Date.now()
      avisarPares({ tipo: 'actividad' })
    }

    for (const senal of SENALES_DE_VIDA) {
      window.addEventListener(senal, marcar, { passive: true })
    }
    return () => {
      for (const senal of SENALES_DE_VIDA) window.removeEventListener(senal, marcar)
    }
  }, [avisarPares])

  useEffect(() => {
    // Sin `BroadcastChannel` cada pestaña se cuida sola. Es peor —dos ventanas abiertas pueden
    // cerrarse en momentos distintos— pero no es un error: la sesión igual se cierra.
    if (typeof BroadcastChannel === 'undefined') return

    const bus = new BroadcastChannel(CANAL)
    canal.current = bus
    bus.onmessage = ({ data }: MessageEvent<Aviso>) => {
      if (data.tipo === 'cerrada') {
        queryClient.clear()
        void navegar({ to: '/entrar', search: { motivo: 'inactividad' } })
        return
      }
      // La actividad en otra pestaña no levanta el aviso de esta: si acá hay una pregunta en
      // pantalla, se contesta acá.
      if (avisando.current) return
      volverAEmpezar()
    }

    return () => {
      canal.current = null
      bus.close()
    }
  }, [navegar, volverAEmpezar])

  useEffect(() => {
    const pulso = () => {
      const ahora = Date.now()
      const paso = pasoDeSesion({ ahora, ultimaActividad: ultimaActividad.current })

      if (paso === 'cerrar') return void cerrar()
      if (paso === 'avisar') {
        avisando.current = true
        setRestante(faltaParaCerrar({ ahora, ultimaActividad: ultimaActividad.current }))
        return
      }
      setRestante(null)
    }

    if (ultimaActividad.current === 0) ultimaActividad.current = Date.now()
    const reloj = setInterval(pulso, PULSO)
    // Volver a la pestaña es el momento en que hay que revisar: mientras estuvo escondida el
    // navegador pudo frenar el reloj, y la cuenta quedó corriendo del lado de afuera.
    document.addEventListener('visibilitychange', pulso)

    return () => {
      clearInterval(reloj)
      document.removeEventListener('visibilitychange', pulso)
    }
  }, [cerrar])

  return (
    <AlertDialog open={restante !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.inactividad.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.inactividad.description(formatearCuenta(restante ?? 0))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void cerrar()}>
            {copy.inactividad.leave}
          </AlertDialogCancel>
          <AlertDialogAction onClick={seguirAca}>{copy.inactividad.stay}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
