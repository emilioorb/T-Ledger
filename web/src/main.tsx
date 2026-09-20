import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme, readTheme } from './lib/theme'
import { queryClient, router } from './router'
import './styles.css'

applyTheme(readTheme())

const container = document.getElementById('root')
if (!container) throw new Error('Falta el contenedor #root en index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
