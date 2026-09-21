import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { fromMoney } from '../../../shared/http/money.schema.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import { CashFlowProjectionUseCase } from '../application/cash-flow-projection.use-case.js'
import type { MonthlyFlow } from '../application/monthly-flow.js'

export const projectionQuerySchema = z
  .object({
    months: z.coerce.number().int().positive().max(120).default(12),
    currency: z.enum(CURRENCIES).default('CRC'),
  })
  .meta({ id: 'ProjectionQuery', title: 'ProjectionQuery' })

type ProjectionQuery = z.infer<typeof projectionQuerySchema>

const toResponse = (flow: MonthlyFlow) => ({
  year: flow.year,
  month: flow.month,
  income: fromMoney(flow.income),
  committed: fromMoney(flow.committed),
  surplus: fromMoney(flow.surplus),
  debtPayments: fromMoney(flow.debtPayments),
  lentCollections: fromMoney(flow.lentCollections),
  goalContributions: fromMoney(flow.goalContributions),
  maturingInvestments: fromMoney(flow.maturingInvestments),
  estimatedSpending: fromMoney(flow.estimatedSpending),
  incomeDeclared: flow.incomeDeclared,
  freed: flow.freed.map((freed) => ({
    debtId: freed.debtId,
    name: freed.name,
    amount: fromMoney(freed.amount),
  })),
})

@Controller('projections')
export class ProjectionsController {
  constructor(private readonly projection: CashFlowProjectionUseCase) {}

  @Get()
  async project(
    @Query(new ZodValidationPipe(projectionQuerySchema)) query: ProjectionQuery,
  ): Promise<ReturnType<typeof toResponse>[]> {
    const flows = await this.projection.execute(query.months, new Date(), query.currency)
    return flows.map(toResponse)
  }
}
