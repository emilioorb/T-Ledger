import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { PeriodKey } from './accounting-period.js'
import type { CategoryKind } from './category.js'
import type { Money } from '../../../shared/kernel/money.js'
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

// Cuánto suma una categoría en un filtro. Va por moneda y no por categoría a secas: sumar
// colones con dólares daría un número que no existe.
export interface CategoryTotal {
  readonly categoryId: string
  readonly total: Money
}

// No hay `delete`: lo que existe es anular. Ofrecer un borrado en la interfaz del
// repositorio invitaría a usarlo, y borrar destruye la trazabilidad que justifica
// llevar contabilidad.
export interface MovementRepository {
  findAll(filters: MovementFilters, page: number, pageSize: number): Promise<MovementPage>

  // Lo mismo que `findAll` resumido por categoría, y sin paginar: la barra de composición
  // habla del filtro entero, no de la página que se está viendo. Sumar en el cliente lo que
  // devuelve una página diría «el 60 % se fue en mercado» sobre veinticinco movimientos de
  // ciento ochenta, y nadie tiene cómo notar que es mentira.
  //
  // Dos reglas que no salen de los filtros. Los anulados no suman, porque un movimiento
  // anulado no se gastó, y pedir justamente los anulados devuelve vacío: una barra que resume
  // otras filas que las de la tabla es peor que ninguna barra. Y sin `kind` se resume el
  // gasto, porque una composición reparte un total entre partes comparables y el salario no
  // es una parte de lo que se gastó.
  totalsByCategory(filters: MovementFilters): Promise<CategoryTotal[]>
  findById(id: string): Promise<Movement | null>

  // Los candidatos a conciliar de una cuenta y un rango, sin paginar. Conciliar traía la
  // primera página de mil movimientos de TODAS las cuentas y filtraba en memoria: pasado el
  // millar, el movimiento que explicaba la línea simplemente no aparecía y nadie lo decía.
  findByPaymentAccount(accountCode: string, range: DateRange): Promise<Movement[]>
  add(movement: Movement): Promise<void>

  // Solo si la fila sigue en la versión del movimiento. Si no, `EditadoPorOtroError`, o
  // `NotFoundError` si ya no existe. Separado de `add` a propósito: un upsert recrearía en
  // silencio lo que no encontró. Devuelve el movimiento en su versión nueva, que es la que
  // tiene que mandar la próxima edición.
  update(movement: Movement): Promise<Movement>

  // Un movimiento activo sin asiento es lo que impide cerrar el mes. Se cuenta en la
  // base: la pantalla de cierre solo necesita el número, no los movimientos.
  countUnposted(range: DateRange): Promise<number>
  monthsWithMovements(): Promise<PeriodKey[]>
}

export const MOVEMENT_REPOSITORY = Symbol('MOVEMENT_REPOSITORY')
