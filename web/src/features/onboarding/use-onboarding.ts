import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { OnboardingStatus } from './types'

// La cabecera va a mano: el modal queda atado al libro en que se abrió, aunque en otra pestaña
// se cambie el activo.
const enElLibro = (bookId: string) => ({ 'x-libro': bookId })

export const useOnboardingStatus = () =>
  useQuery({
    queryKey: queryKeys.onboarding.status(),
    queryFn: () => apiFetch<OnboardingStatus>('/onboarding'),
    staleTime: Infinity,
  })

// Sin esperar la respuesta ni avisar si falla: el modal ya está abierto, y lo peor que pasa es
// que la próxima vez vuelva a aparecer.
export const useEmpezarBienvenida = () =>
  useMutation({
    mutationFn: (bookId: string) =>
      apiFetch<void>('/onboarding/start', { method: 'POST', headers: enElLibro(bookId) }),
  })

export const usePasoDeBienvenida = <Entrada, Resultado>(bookId: string, path: string) => {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (entrada: Entrada) =>
      apiFetch<Resultado>(`/onboarding/${path}`, {
        method: 'POST',
        body: JSON.stringify(entrada),
        headers: enElLibro(bookId),
      }),
    // Lo que se creó aparece en sus pantallas: plan, categorías, bancos, presupuesto.
    onSuccess: () => cliente.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'onboarding' }),
  })
}
