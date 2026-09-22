import type { Percentage } from '../../../shared/kernel/percentage.js'

export interface BudgetBucket {
  readonly id: string
  readonly name: string
  readonly percentage: Percentage
  // Los abonos extraordinarios a deudas caen siempre acá, sea cual sea la cubeta de la deuda.
  readonly isSavings: boolean
  // Cuál de los diez colores del sistema, por número. `null` es «el que le toque por su
  // lugar», que es como se pintaban antes de que se pudieran elegir.
  readonly colorIndex: number | null
}
