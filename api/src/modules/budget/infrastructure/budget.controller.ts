import { Body, Controller, Get, Inject, Param, Put, Query } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney, type MoneyDto } from '../../../shared/http/money.schema.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { isErr } from '../../../shared/kernel/result.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import { EvaluateMonthUseCase } from '../application/evaluate-month.use-case.js'
import {
  BUDGET_INCOME_REPOSITORY,
  type BudgetIncomeRepository,
} from '../domain/budget-income-repository.port.js'
import { toEvaluationResponse, toIncomeResponse } from './budget.presenters.js'
import {
  evaluationQuerySchema,
  monthlyIncomeSchema,
  type EvaluationQuery,
  type MonthlyIncomeInput,
} from './budget.schemas.js'

const keyOf = (period: string): PeriodKey => {
  const key = PeriodKey.parse(period)
  if (isErr(key)) throw new SemanticValidationError(key.error.message)
  return key.value
}

@Controller('budget')
export class BudgetController {
  constructor(
    private readonly evaluateMonth: EvaluateMonthUseCase,
    @Inject(BUDGET_INCOME_REPOSITORY) private readonly incomes: BudgetIncomeRepository,
  ) {}

  @Get('evaluation')
  async evaluation(
    @Query(new ZodValidationPipe(evaluationQuerySchema)) query: EvaluationQuery,
  ): Promise<ReturnType<typeof toEvaluationResponse>> {
    const period = keyOf(query.month)
    return toEvaluationResponse(period, await this.evaluateMonth.execute(period, query.currency))
  }

  @Get('income/:period')
  async income(
    @Param('period') period: string,
  ): Promise<{ period: string; amount: MoneyDto } | null> {
    const income = await this.incomes.find(keyOf(period))
    return income ? toIncomeResponse(income) : null
  }

  // PUT y no POST: el ingreso de un mes es uno solo, y declararlo dos veces lo corrige,
  // no lo duplica.
  @Put('income/:period')
  async setIncome(
    @Param('period') period: string,
    @Body(new ZodValidationPipe(monthlyIncomeSchema)) input: MonthlyIncomeInput,
  ): Promise<{ period: string; amount: MoneyDto }> {
    const key = keyOf(period)
    const income = { period: key, amount: toMoney(input.amount) }
    await this.incomes.save(income)
    return toIncomeResponse(income)
  }
}
