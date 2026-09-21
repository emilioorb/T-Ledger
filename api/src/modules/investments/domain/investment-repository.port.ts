import type { Investment, InvestmentContribution } from './investment.js'

export interface InvestmentRepository {
  findAll(): Promise<Investment[]>
  findById(id: string): Promise<Investment | null>
  save(investment: Investment): Promise<void>
  addContribution(investmentId: string, contribution: InvestmentContribution): Promise<void>
  delete(id: string): Promise<boolean>
}

export const INVESTMENT_REPOSITORY = Symbol('INVESTMENT_REPOSITORY')
