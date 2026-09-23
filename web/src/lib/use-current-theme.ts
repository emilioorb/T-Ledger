import { useSyncExternalStore } from 'react'
import type { Theme } from './theme'

const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

const observar = (avisar: () => void) => {
  const observer = new MutationObserver(avisar)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

// El prerender de la portada no tiene documento: se renderiza en su tema, el claro, y el cliente
// corrige apenas hidrata.
const enElServidor = (): Theme => 'light'

// El tema vive en data-theme del <html>, no en un contexto de React: quien necesite
// reaccionar a un cambio de tema observa el atributo.
export const useCurrentTheme = (): Theme => useSyncExternalStore(observar, read, enElServidor)
