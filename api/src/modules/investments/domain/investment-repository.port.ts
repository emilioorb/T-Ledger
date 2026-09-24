import type { Investment, InvestmentContribution } from './investment.js'

export interface InvestmentRepository {
  findAll(): Promise<Investment[]>
  findById(id: string): Promise<Investment | null>
  add(investment: Investment): Promise<void>
  // Solo si la fila sigue en la versión: si no, `EditadoPorOtroError`, o `NotFoundError` si ya
  // no existe. Devuelve la inversión en su versión nueva. Los aportes no se tocan.
  update(investment: Investment): Promise<Investment>
  // Sube la versión de la inversión: quien la leyó antes del aporte no guarda encima sin enterarse.
  addContribution(investmentId: string, contribution: InvestmentContribution): Promise<void>
  delete(id: string): Promise<boolean>
}

export const INVESTMENT_REPOSITORY = Symbol('INVESTMENT_REPOSITORY')
