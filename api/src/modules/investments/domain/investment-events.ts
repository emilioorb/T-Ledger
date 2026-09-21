export const INVESTMENT_MATURED = 'investment.matured'

// Una inversión que vence devuelve capital: quien planifique el flujo del mes necesita
// enterarse sin que el caso de uso de inversiones conozca a la proyección.
export interface InvestmentMatured {
  readonly investmentId: string
  readonly name: string
  readonly maturedAt: Date
}
