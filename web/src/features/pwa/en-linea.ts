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

// Un `fetch` que no llega al servidor falla con TypeError, no con una respuesta: es la única
// forma de distinguir «no hay red» de «el servidor dijo que no».
export const esFaltaDeRed = (error: unknown): boolean => error instanceof TypeError
