import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'
import { copy } from './copy'

const suscribir = (avisar: () => void) => {
  window.addEventListener('online', avisar)
  window.addEventListener('offline', avisar)
  return () => {
    window.removeEventListener('online', avisar)
    window.removeEventListener('offline', avisar)
  }
}

const enLinea = () => navigator.onLine

// Sin red la interfaz abre desde el caché, pero ninguna cifra: la API no se guarda en el
// dispositivo. Este aviso explica por qué las pantallas no cargan, en vez de dejar esqueletos
// esperando algo que no va a llegar.
export const AvisoSinConexion = () => {
  const conectado = useSyncExternalStore(suscribir, enLinea)
  if (conectado) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-border bg-secondary px-4 py-2 text-sm text-foreground"
    >
      <WifiOff className="size-4 shrink-0 text-warning" aria-hidden="true" />
      {copy.sinConexion}
    </div>
  )
}
