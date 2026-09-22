import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { iniciarObservabilidad } from './lib/observability'
import { applyTheme, seguirAlSistema, tema } from './lib/theme'
import { queryClient, router } from './router'
import './styles.css'

// Antes del render: un error durante el primer montaje también tiene que reportarse, y es
// justo cuando más se rompe.
iniciarObservabilidad()

// La preferencia guardada, pintada antes del primer render. Y si esa preferencia es «la del
// sistema», se queda escuchando: cambiar el modo del sistema operativo con la app abierta
// tiene que verse en el momento, no en la próxima recarga.
applyTheme(tema.leer())
seguirAlSistema()

const container = document.getElementById('root')
if (!container) throw new Error('Falta el contenedor #root en index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
