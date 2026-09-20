import { Injectable } from '@nestjs/common'
import { isErr } from '../../../shared/kernel/result.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import type { DebtProjection } from '../domain/extra-payment.js'
import type { SimulateExtraPaymentInput } from '../infrastructure/schedule.schemas.js'
import { GetDebtUseCase } from './get-debt.use-case.js'

@Injectable()
export class SimulateExtraPaymentUseCase {
  constructor(private readonly getDebt: GetDebtUseCase) {}

  async execute(id: string, input: SimulateExtraPaymentInput): Promise<DebtProjection> {
    const debt = await this.getDebt.execute(id)
    const projection = debt.applyExtraPayment({
      amount: toMoney(input.amount),
      afterInstallment: input.afterInstallment,
      mode: input.mode,
    })
    if (isErr(projection)) throw new SemanticValidationError(projection.error.message)
    return projection.value
  }
}
