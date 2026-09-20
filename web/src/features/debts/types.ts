import type { components } from '@/lib/api-types.gen'

// Ningún tipo de respuesta se declara a mano: todos salen del OpenAPI generado.
export type Money = components['schemas']['Money']
export type Debt = components['schemas']['Debt']
export type DebtInput = components['schemas']['CreateDebtInput']
export type DebtPatch = components['schemas']['UpdateDebtInput']
export type Schedule = components['schemas']['AmortizationSchedule']
export type Installment = components['schemas']['Installment']
export type Projection = components['schemas']['ExtraPaymentProjection']
export type PayoffPlan = components['schemas']['PayoffPlan']
export type SimulateInput = components['schemas']['SimulateExtraPaymentInput']

export type DebtDirection = DebtInput['direction']
export type PayoffStrategy = PayoffPlan['strategy']

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}
