import { useState } from 'react'
import { useHidratado } from '@/lib/use-hidratado'

// Sin registro del primer pintado (pestaña en segundo plano, o hidrata antes de que el navegador
// lo anote) se cuenta desde ahora: mejor arrancar la coreografía tarde que darla por terminada.
const desdeElPrimerPintado = (): number => {
  const pintado = performance.getEntriesByName('first-contentful-paint')[0]?.startTime
  return pintado === undefined ? 0 : Math.max(0, performance.now() - pintado)
}

// Cuánto hace que se pintó la portada, si este montaje hidrata el HTML prerenderizado: las
// animaciones CSS de ese HTML arrancaron con el primer pintado, y lo que mueve JavaScript tiene
// que ir con ellas. Cero cuando la portada se creó en el navegador, como al navegar hasta ella.
export const useDesfaseDeHidratacion = (): number => {
  const hidratado = useHidratado()
  const [desfase] = useState(() => (hidratado ? 0 : desdeElPrimerPintado()))
  return desfase
}
