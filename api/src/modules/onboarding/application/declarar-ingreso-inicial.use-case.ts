import { Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import { DeclararIngresoUseCase } from '../../budget/application/declarar-ingreso.use-case.js'
import type { IncomeInput } from '../infrastructure/onboarding.schemas.js'
import { PasoIdempotente } from './paso-idempotente.js'

@Injectable()
export class DeclararIngresoInicialUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly ingreso: DeclararIngresoUseCase,
  ) {}

  // `null` como versión: se vio el mes sin ingreso. Si alguien lo declaró en el medio, 409.
  execute(input: IncomeInput): Promise<IncomeInput> {
    return this.paso.correr('income', async () => {
      const period = PeriodKey.parse(input.month)
      if (isErr(period)) throw new SemanticValidationError(period.error.message)
      await this.ingreso.execute({ period: period.value, amount: toMoney(input.amount) }, null)
      return input
    })
  }
}
