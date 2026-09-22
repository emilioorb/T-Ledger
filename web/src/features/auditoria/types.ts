import type { components, paths } from '@/lib/api-types.gen'

export type EntradaDeRastro = components['schemas']['EntradaDeRastro']
export type CambioDeRastro = components['schemas']['CambioDeRastro']

// Las siete cosas que dejan rastro, tal como las nombra el contrato. Se deriva del esquema y
// no se escribe a mano: el día que el backend agregue una octava, esto falla acá y no en
// producción con una fila que la pantalla no sabe cómo llamar.
// Sale de los parámetros del endpoint y no de `components`: los filtros de una consulta se
// inline-an en la ruta, no se registran como esquema aparte.
export type EntidadAuditada = NonNullable<
  NonNullable<paths['/audit-log']['get']['parameters']['query']>['entity']
>

export interface PaginaDeRastro {
  data: EntradaDeRastro[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}
