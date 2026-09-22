import { useSyncExternalStore } from 'react'

// Un ajuste que vive en este navegador y que más de una pantalla necesita ver a la vez.
//
// El `localStorage` solo no alcanza: escribirlo no avisa a nadie en la misma pestaña —el
// evento `storage` es para las *otras*— así que el menú podía cambiar el tema y el avatar del
// tablero seguir del color viejo hasta recargar. Acá la escritura avisa a quien esté mirando.
//
// Y son ajustes del aparato, no de la persona: el tema y el color de la mascota dependen de la
// pantalla que tenés enfrente, no de quién sos. Por eso no viajan al servidor.
export interface Ajuste<T> {
  leer: () => T
  poner: (valor: T) => void
  usar: () => T
}

export const crearAjuste = <T>(
  clave: string,
  interpretar: (guardado: string | null) => T,
  aTexto: (valor: T) => string,
  alCambiar?: (valor: T) => void,
): Ajuste<T> => {
  const suscriptores = new Set<() => void>()

  // Se cachea porque `useSyncExternalStore` compara por identidad lo que devuelve la
  // instantánea: leer y convertir en cada render devolvería un valor nuevo cada vez y React
  // entraría en un bucle de renders.
  let actual: T | undefined

  const leer = (): T => {
    if (actual === undefined) actual = interpretar(localStorage.getItem(clave))
    return actual
  }

  const avisar = () => {
    for (const suscriptor of suscriptores) suscriptor()
  }

  const poner = (valor: T): void => {
    actual = valor
    localStorage.setItem(clave, aTexto(valor))
    alCambiar?.(valor)
    avisar()
  }

  const usar = (): T =>
    useSyncExternalStore(
      (suscriptor) => {
        suscriptores.add(suscriptor)
        return () => suscriptores.delete(suscriptor)
      },
      leer,
      // En el servidor no hay `localStorage`. Hoy la app no hace SSR, pero una instantánea
      // que reviente ahí es una trampa puesta para el día que lo haga.
      () => interpretar(null),
    )

  return { leer, poner, usar }
}
