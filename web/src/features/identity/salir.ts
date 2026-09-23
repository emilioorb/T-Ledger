import type { QueryClient } from '@tanstack/react-query'
import { olvidarQuienEra } from '@/lib/observability'
import { recuerdoDeSesion } from './recuerdo-de-sesion'

// Lo que queda de una persona en este navegador cuando sale, sea a mano o por inactividad: la
// caché con sus saldos y movimientos, quién es para Sentry, y la marca que le diría a la portada
// que la mande al tablero.
export const olvidarLaSesionLocal = (queryClient: QueryClient): void => {
  queryClient.clear()
  olvidarQuienEra()
  recuerdoDeSesion.olvidar()
}
