import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import type { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { BudgetEvaluation } from '../domain/budget-evaluation.js'
import {
  BUDGET_INCOME_REPOSITORY,
  type BudgetIncomeRepository,
} from '../domain/budget-income-repository.port.js'
import {
  BUDGET_MODEL_REPOSITORY,
  type BudgetModelRepository,
} from '../domain/budget-model-repository.port.js'
import { AccountingSpendingProvider } from '../infrastructure/accounting-spending.provider.js'

export interface MonthEvaluation extends BudgetEvaluation {
  readonly modelId: string
  readonly modelName: string
  // Sin ingreso declarado se evalúa igual, con cero, y la respuesta lo dice: mostrar un
  // presupuesto sobre un ingreso inventado sería peor que mostrar que falta el dato.
  readonly incomeDeclared: boolean
}

@Injectable()
export class EvaluateMonthUseCase {
  constructor(
    @Inject(BUDGET_MODEL_REPOSITORY) private readonly models: BudgetModelRepository,
    @Inject(BUDGET_INCOME_REPOSITORY) private readonly incomes: BudgetIncomeRepository,
    private readonly spendingProvider: AccountingSpendingProvider,
  ) {}

  async execute(period: PeriodKey, currency: CurrencyCode): Promise<MonthEvaluation> {
    const model = await this.models.findActive()
    if (!model) {
      throw new SemanticValidationError(
        'No hay ningún modelo de presupuesto activo. Activá uno para poder evaluar el mes.',
      )
    }

    const [mapping, declared] = await Promise.all([
      this.models.mappingFor(model.id),
      this.incomes.find(period),
    ])

    const income = declared?.amount ?? Money.zero(currency)
    const spending = await this.spendingProvider.spendingFor(period, currency, mapping)

    return {
      ...model.evaluate(income, spending),
      modelId: model.id,
      modelName: model.name,
      incomeDeclared: declared !== null,
    }
  }
}
