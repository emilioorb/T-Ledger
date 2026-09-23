import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import type { Router } from './router'

// El árbol entero, el mismo en el navegador y en el prerender de la portada: si difieren en un
// solo nodo, la hidratación no calza.
export const App = ({ router, queryClient }: { router: Router; queryClient: QueryClient }) => (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
