import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiError } from './lib/api'
import { routeTree } from './routeTree.gen'

const describe = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'No se pudo completar la operación'

// Un QueryCache y un MutationCache con onError cubren todos los errores de una sola vez,
// sin que cada pantalla tenga que acordarse.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  queryCache: new QueryCache({ onError: (error) => toast.error(describe(error)) }),
  mutationCache: new MutationCache({ onError: (error) => toast.error(describe(error)) }),
})

// defaultPreloadStaleTime en 0 deja que TanStack Query gobierne el caché, no el router.
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
