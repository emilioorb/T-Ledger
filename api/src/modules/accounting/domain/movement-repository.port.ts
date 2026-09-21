import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { PeriodKey } from './accounting-period.js'
import type { CategoryKind } from './category.js'
import type { Movement, MovementStatus } from './movement.js'

export interface MovementFilters {
  readonly kind?: CategoryKind
  readonly status?: MovementStatus
  readonly categoryId?: string
  readonly range?: DateRange
  // Busca en la contraparte. Va en el filtro y no en el cliente porque la lista viene
  // paginada: buscar sobre la página cargada solo encontraría lo que ya se está viendo.
  readonly search?: string
}

export interface MovementPage {
  readonly items: Movement[]
  readonly totalItems: number
}

// No hay `delete`: lo que existe es anular. Ofrecer un borrado en la interfaz del
// repositorio invitaría a usarlo, y borrar destruye la trazabilidad que justifica
// llevar contabilidad.
export interface MovementRepository {
  findAll(filters: MovementFilters, page: number, pageSize: number): Promise<MovementPage>
  findById(id: string): Promise<Movement | null>
  save(movement: Movement): Promise<void>

  // Un movimiento activo sin asiento es lo que impide cerrar el mes. Se cuenta en la
  // base: la pantalla de cierre solo necesita el número, no los movimientos.
  countUnposted(range: DateRange): Promise<number>
  monthsWithMovements(): Promise<PeriodKey[]>
}

export const MOVEMENT_REPOSITORY = Symbol('MOVEMENT_REPOSITORY')
