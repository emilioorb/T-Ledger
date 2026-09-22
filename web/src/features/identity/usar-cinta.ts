import { useEffect, useRef, type RefObject } from 'react'
import { rampa } from '@/lib/rampa'

// El rollo corre por la Web Animations API y no por CSS, por tres cosas que CSS no puede:
//
//   1. Frenar de a poco. `animation-play-state: paused` detiene el papel en un cuadro, que es
//      lo único que un rollo con inercia no puede hacer. Acá la velocidad baja por una rampa.
//   2. Cambiar de velocidad sin saltar. Tocar `animation-duration` en el medio recalcula el
//      progreso y la cinta pega un brinco; `updatePlaybackRate` sincroniza la posición antes
//      de aplicar la velocidad nueva, que es para lo que existe.
//   3. Decidir de verdad sobre `prefers-reduced-motion`. La regla global manda las duraciones
//      a 0,01 ms, y eso dejaba la cinta quieta por casualidad —saltaba al final, que se ve
//      igual que el principio—. Acá, si pidieron menos movimiento, no se arranca y ya.
const VUELTA = 72_000

// No se detiene del todo al acercar el mouse: se queda casi quieta. Un cero exacto se lee
// como que algo se rompió; un hilo de movimiento se lee como que está esperando.
const RALENTI = 0.08
const RAMPA = 450

const prefiereQuietud = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Cinta<Z extends HTMLElement, R extends HTMLElement> {
  // Dónde se detecta el puntero.
  zona: RefObject<Z | null>
  // Qué se mueve.
  rollo: RefObject<R | null>
}

export const usarCinta = <Z extends HTMLElement, R extends HTMLElement>(): Cinta<Z, R> => {
  const zona = useRef<Z>(null)
  const rollo = useRef<R>(null)

  useEffect(() => {
    const papel = rollo.current
    const area = zona.current
    if (!papel || !area || prefiereQuietud()) return

    // El -50 % es la mitad de una lista duplicada: al terminar la vuelta, lo que se ve es el
    // comienzo de la segunda copia, idéntico al de la primera, y el corte no existe.
    const corriendo = papel.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }],
      { duration: VUELTA, iterations: Infinity, easing: 'linear' },
    )

    // La velocidad se lleva acá y no se le pregunta a la animación: `updatePlaybackRate` deja
    // el cambio pendiente hasta el cuadro siguiente, así que leerla a mitad de una rampa
    // devuelve el valor viejo y la interpolación se traba contra sí misma.
    let velocidad = 1
    let cancelarRampa = () => {}

    const frenarHasta = (destino: number) => {
      cancelarRampa()
      cancelarRampa = rampa({ desde: velocidad, hasta: destino, duracion: RAMPA }, (valor) => {
        velocidad = valor
        corriendo.updatePlaybackRate(valor)
      })
    }

    // `pointerType` en vez de una consulta de medios: el hover falso existe —en una tableta en
    // horizontal el panel se ve, porque está arriba de `lg`, y un toque dispara `enter`—, y
    // preguntar por el puntero que produjo *este* evento es más exacto que preguntar qué
    // punteros tiene el aparato. Van nativos y no por React para que los ponga y los saque el
    // mismo efecto que crea la animación: un solo dueño, una sola limpieza.
    const conMouse = (correr: () => void) => (evento: PointerEvent) => {
      if (evento.pointerType === 'mouse') correr()
    }

    const entrar = conMouse(() => frenarHasta(RALENTI))
    const salir = conMouse(() => frenarHasta(1))

    area.addEventListener('pointerenter', entrar)
    area.addEventListener('pointerleave', salir)

    return () => {
      area.removeEventListener('pointerenter', entrar)
      area.removeEventListener('pointerleave', salir)
      cancelarRampa()
      corriendo.cancel()
    }
  }, [])

  return { zona, rollo }
}
