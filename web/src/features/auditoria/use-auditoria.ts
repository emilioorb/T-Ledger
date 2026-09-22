import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { SortDirection } from '@/lib/use-table-controls'
import type { EntidadAuditada, EntradaDeRastro, PaginaDeRastro } from './types'

// Las columnas por las que el servidor sabe ordenar. El tipo evita que la pantalla pida una
// que el endpoint no entiende y se lleve un 400 en la cara.
export type ColumnaDeRastro = 'cuando' | 'quien' | 'que'

export interface OrdenDeRastro {
  key: ColumnaDeRastro
  direction: SortDirection
}

export const PAGE_SIZE = 25

export interface ConsultaDeRastro {
  entidad: EntidadAuditada | null
  busqueda: string
  orden: OrdenDeRastro
  page: number
}

export const useRastro = ({ entidad, busqueda, orden, page }: ConsultaDeRastro) =>
  useQuery({
    queryKey: queryKeys.auditoria.list({ entidad, busqueda, orden, page }),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort: orden.key,
        direction: orden.direction,
      })
      if (entidad) params.set('entity', entidad)
      if (busqueda) params.set('search', busqueda)
      return apiFetch<PaginaDeRastro>(`/audit-log?${params.toString()}`)
    },
    // El registro es historia: lo que ya pasó no cambia, y lo único que puede aparecer es una
    // entrada nueva arriba. Refrescarlo al volver a la pestaña sería pedirle al servidor que
    // repita la misma respuesta.
    staleTime: 30_000,
  })

export type { EntradaDeRastro }
