import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch, esEditadoPorOtro, esReintentar } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type {
  Debt,
  DebtDirection,
  DebtInput,
  DebtPatch,
  Paginated,
  PayoffPlan,
  PayoffStrategy,
  Projection,
  DebtSchedule,
  PagarCuotaInput,
  SimulateInput,
} from './types'

// Ningún hook trae onError: el QueryCache y el MutationCache del router ya cubren
// todos los errores con un toast. Repetirlo acá duplicaría el toast, no lo reforzaría.

// 100 es el tope que admite la API. Con un solo usuario, una lista entera de un
// tirón se lee mejor que partida en páginas, que es lo que pide la densidad.
// `at` mira el saldo a una fecha. Va en la clave porque la caché se resuelve solo por la
// clave: sin él, pedir el cierre del mes pasado devolvería lo que ya estaba guardado de hoy.
export const useDebts = (direction: DebtDirection, at?: string, page = 1, pageSize = 100) =>
  useQuery({
    queryKey: queryKeys.debts.list({ page, pageSize, direction, at }),
    queryFn: () =>
      apiFetch<Paginated<Debt>>(
        `/debts?page=${page}&pageSize=${pageSize}&direction=${direction}${at ? `&at=${at}` : ''}`,
      ),
  })

export const useDebt = (id: string) =>
  useQuery({ queryKey: queryKeys.debts.detail(id), queryFn: () => apiFetch<Debt>(`/debts/${id}`) })

export const useSchedule = (id: string) =>
  useQuery({
    queryKey: queryKeys.debts.schedule(id),
    queryFn: () => apiFetch<DebtSchedule>(`/debts/${id}/schedule`),
  })

export const usePayoffPlan = (strategy: PayoffStrategy) =>
  useQuery({
    queryKey: queryKeys.debts.payoffPlan(strategy),
    queryFn: () => apiFetch<PayoffPlan>(`/debts/payoff-plan?strategy=${strategy}`),
  })

export const useCreateDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DebtInput) =>
      apiFetch<Debt>('/debts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.toast.created)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

// El id viaja con la llamada y no con el hook: el modal de edición es uno solo y la deuda
// que muestra cambia con cada fila.
export const useUpdateDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DebtPatch }) =>
      apiFetch<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.toast.updated)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useDeleteDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/debts/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(copy.toast.deleted)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useSimulateExtraPayment = (id: string) =>
  useMutation({
    mutationFn: (input: SimulateInput) =>
      apiFetch<Projection>(`/debts/${id}/simulate`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })

// Un pago mueve tres cosas a la vez: la deuda (su saldo y su tabla), la contabilidad (el gasto
// y su asiento) y el presupuesto (la cubeta que la cuota consume).
const useRefrescarTrasPagar = () => {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.debts.all }),
      client.invalidateQueries({ queryKey: queryKeys.accounting.all }),
      client.invalidateQueries({ queryKey: queryKeys.budget.all }),
    ])
}

export const usePagarCuota = (id: string) => {
  const refrescar = useRefrescarTrasPagar()
  return useMutation({
    mutationFn: (input: PagarCuotaInput) =>
      apiFetch<Debt>(`/debts/${id}/payments`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.pagos.toast.paid)
      await refrescar()
    },
    onError: avisarRechazo,
  })
}

export const useSaldarCuota = (id: string) => {
  const refrescar = useRefrescarTrasPagar()
  return useMutation({
    mutationFn: (date: string) =>
      apiFetch<Debt>(`/debts/${id}/payments/settled`, { method: 'POST', body: JSON.stringify({ date }) }),
    onSuccess: async () => {
      toast.success(copy.pagos.toast.settled)
      await refrescar()
    },
    onError: avisarRechazo,
  })
}

export const useDeshacerPago = (id: string) => {
  const refrescar = useRefrescarTrasPagar()
  return useMutation({
    mutationFn: () => apiFetch<Debt>(`/debts/${id}/payments/last`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(copy.pagos.toast.undone)
      await refrescar()
    },
    onError: avisarRechazo,
  })
}

// «Otro guardó antes» lo avisa la caché de mutaciones, con «Cargar lo último»: acá no se repite.
const avisarRechazo = (error: unknown): void => {
  if (!esEditadoPorOtro(error)) toast.error(motivoDelRechazo(error))
}

// Por el `code` y no por el 409 a secas: el 409 también es «otro guardó antes» y «probá de nuevo»,
// y esos traen su propio mensaje. `CONFLICT` es el mes cerrado; el 422, lo que el servidor explica
// con palabras que la persona entiende —no quedan cuotas, la fecha es anterior al último pago—.
const motivoDelRechazo = (error: unknown): string => {
  if (esReintentar(error)) return error.message
  if (error instanceof ApiError && error.code === 'CONFLICT') return copy.pagos.toast.closedPeriod
  if (error instanceof ApiError && error.status === 422) return error.message
  return copy.pagos.toast.failed
}

export const useGuardarNotas = (id: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (notes: string | null) =>
      apiFetch<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
    onSuccess: async () => {
      toast.success(copy.notas.saved)
      await client.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
    onError: () => toast.error(copy.notas.failed),
  })
}

export const useSubirDocumento = (id: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) => {
      const cuerpo = new FormData()
      cuerpo.append('archivo', archivo)
      // Sin `Content-Type` a mano: el navegador lo pone con el `boundary` que genera.
      return apiFetch<Debt>(`/debts/${id}/document`, { method: 'POST', body: cuerpo })
    },
    onSuccess: async () => {
      toast.success(copy.notas.document.uploaded)
      await client.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
    // El 400 trae el motivo en palabras: tipo, tamaño o archivo vacío.
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError && error.status === 400 ? error.message : copy.notas.document.failed),
  })
}

export const useQuitarDocumento = (id: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<Debt>(`/debts/${id}/document`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(copy.notas.document.removed)
      await client.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}
