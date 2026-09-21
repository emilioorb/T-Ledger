import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { CategoryKind } from './category.js'
import type { Movement, MovementStatus } from './movement.js'

export interface MovementFilters {
  readonly kind?: CategoryKind
  readonly status?: MovementStatus
  readonly categoryId?: string
  readonly range?: DateRange
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
}

export const MOVEMENT_REPOSITORY = Symbol('MOVEMENT_REPOSITORY')
