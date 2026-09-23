import { useSyncExternalStore } from 'react'

const suscribir = (avisar: () => void) => {
  window.addEventListener('online', avisar)
  window.addEventListener('offline', avisar)
  return () => {
    window.removeEventListener('online', avisar)
    window.removeEventListener('offline', avisar)
  }
}

const conectado = () => navigator.onLine

// En el prerender se da por conectado, que es lo que ve casi todo el mundo al abrir: sin red,
// el aviso aparece apenas termina de hidratar.
// https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering
const conectadoEnElServidor = () => true

export const useEnLinea = (): boolean =>
  useSyncExternalStore(suscribir, conectado, conectadoEnElServidor)
