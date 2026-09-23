import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { toast } from 'sonner'
import { NotFound } from './components/not-found'
import { ErrorDeCarga } from './features/pwa/error-de-carga'
import { ApiError } from './lib/api'
import { routeTree } from './routeTree.gen'

const describe = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'No se pudo completar la operación'

// Una consulta que falla ya lo explica en pantalla con su ErrorState y su reintento: el toast
// encima diría dos veces lo mismo. Por eso el aviso es opt-in, para la consulta secundaria que
// no tiene dónde contar su propio fallo. Una mutación sí avisa siempre: no tiene superficie.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.toastsError !== true) return
      toast.error(describe(error))
    },
  }),
  mutationCache: new MutationCache({ onError: (error) => toast.error(describe(error)) }),
})

// defaultPreloadStaleTime en 0 deja que TanStack Query gobierne el caché, no el router.
// Fábrica y no solo instancia: el prerender de la portada arma el suyo, con historia en memoria.
export const crearRouter = (contexto: { queryClient: QueryClient; history?: RouterHistory }) =>
  createRouter({
    routeTree,
    history: contexto.history,
    context: { queryClient: contexto.queryClient },
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorDeCarga,
  })

export type Router = ReturnType<typeof crearRouter>

export const router = crearRouter({ queryClient })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
