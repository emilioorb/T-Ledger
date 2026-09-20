import { Injectable } from '@nestjs/common'
import type { AmortizationSchedule } from '../domain/amortization.js'
import { GetDebtUseCase } from './get-debt.use-case.js'

@Injectable()
export class GetScheduleUseCase {
  constructor(private readonly getDebt: GetDebtUseCase) {}

  async execute(id: string): Promise<AmortizationSchedule> {
    return (await this.getDebt.execute(id)).schedule()
  }
}
