import { Injectable } from '@nestjs/common'
import type { Debt } from '../domain/debt.js'
import { GetDebtUseCase } from './get-debt.use-case.js'

@Injectable()
export class GetScheduleUseCase {
  constructor(private readonly getDebt: GetDebtUseCase) {}

  // La deuda entera y no solo su tabla: el estado de cada cuota sale de sus pagos.
  async execute(id: string): Promise<Debt> {
    return this.getDebt.execute(id)
  }
}
