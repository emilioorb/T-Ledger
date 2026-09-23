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

export const useEnLinea = (): boolean => useSyncExternalStore(suscribir, conectado)
