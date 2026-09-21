import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Decimal } from 'decimal.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { BucketGuard } from '../../budget/application/bucket-guard.js'
import { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import type { CreateDebtInput } from '../infrastructure/debt.schemas.js'

@Injectable()
export class CreateDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    private readonly buckets: BucketGuard,
  ) {}

  async execute(input: CreateDebtInput): Promise<Debt> {
    await this.buckets.assertExists(input.budgetBucket)

    const rate = InterestRate.create(new Decimal(input.annualRate), input.compounding)
    if (isErr(rate)) throw new SemanticValidationError(rate.error.message)

    const debt = Debt.create({
      id: randomUUID(),
      name: input.name,
      counterparty: input.counterparty,
      principal: toMoney(input.principal),
      rate: rate.value,
      termMonths: input.termMonths,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      kind: input.kind,
      direction: input.direction,
      budgetBucket: input.budgetBucket,
    })
    if (isErr(debt)) throw new SemanticValidationError(debt.error.message)

    await this.debts.save(debt.value)
    return debt.value
  }
}
