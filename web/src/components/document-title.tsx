import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { documentTitleFor } from '@/features/shell/page-title'

// El título de la pestaña es lo primero que lee un lector de pantalla al cambiar de ruta y
// lo único que distingue una pestaña de otra. Vive acá y no en cada ruta por la misma razón
// que la miga: una pantalla que se olvide de declararlo dejaría la pestaña mintiendo.
export const DocumentTitle = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    document.title = documentTitleFor(pathname)
  }, [pathname])

  return null
}
