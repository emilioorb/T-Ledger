import { WifiOff } from 'lucide-react'
import { copy } from './copy'
import { useEnLinea } from './en-linea'

// Sin red la interfaz abre desde el caché, pero ninguna cifra: la API no se guarda en el
// dispositivo. Este aviso explica por qué las pantallas no cargan, en vez de dejar esqueletos
// esperando algo que no va a llegar.
export const AvisoSinConexion = () => {
  if (useEnLinea()) return null

  return (
    <div
      role="status"
      // Abajo y al centro, flotando: arriba tapaba el encabezado, que es justo por donde se
      // navega mientras se espera que vuelva la red. En el teléfono va más arriba: abajo a la
      // derecha está el botón del tema de las pantallas públicas.
      className="fixed bottom-20 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-foreground shadow-sm sm:bottom-4"
    >
      <WifiOff className="size-4 shrink-0 text-warning" aria-hidden="true" />
      {copy.sinConexion}
    </div>
  )
}
