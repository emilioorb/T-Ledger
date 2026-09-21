import type { Money } from '../../../shared/kernel/money.js'

export interface FreedInstallment {
  readonly debtId: string
  readonly name: string
  readonly amount: Money
}

export interface MonthlyFlow {
  readonly year: number
  readonly month: number
  readonly income: Money
  readonly committed: Money
  readonly surplus: Money
  readonly debtPayments: Money
  readonly lentCollections: Money
  readonly goalContributions: Money
  readonly maturingInvestments: Money
  readonly estimatedSpending: Money
  // Falso cuando el ingreso viene arrastrado de un mes anterior, para que la pantalla
  // pueda decir que ese número es una suposición y no un dato.
  readonly incomeDeclared: boolean
  // El valor de la proyección no está en el total sino en saber en qué mes deja de
  // salir cada cuota.
  readonly freed: FreedInstallment[]
}
