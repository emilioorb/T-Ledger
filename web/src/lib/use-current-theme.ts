import { useEffect, useState } from 'react'
import type { Theme } from './theme'

const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

// El tema vive en data-theme del <html>, no en un contexto de React: quien necesite
// reaccionar a un cambio de tema observa el atributo.
export const useCurrentTheme = (): Theme => {
  const [theme, setTheme] = useState<Theme>(read)

  useEffect(() => {
    const target = document.documentElement
    const observer = new MutationObserver(() => setTheme(read()))
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
