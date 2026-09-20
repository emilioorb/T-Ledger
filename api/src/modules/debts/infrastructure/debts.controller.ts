import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { fromMoney } from '../../../shared/http/money.schema.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { CreateDebtUseCase } from '../application/create-debt.use-case.js'
import { DeleteDebtUseCase } from '../application/delete-debt.use-case.js'
import { GetDebtUseCase } from '../application/get-debt.use-case.js'
import { GetPayoffPlanUseCase } from '../application/get-payoff-plan.use-case.js'
import { GetScheduleUseCase } from '../application/get-schedule.use-case.js'
import { ListDebtsUseCase } from '../application/list-debts.use-case.js'
import { SimulateExtraPaymentUseCase } from '../application/simulate-extra-payment.use-case.js'
import { UpdateDebtUseCase } from '../application/update-debt.use-case.js'
import { toDebtResponse } from './debt.presenter.js'
import {
  createDebtSchema,
  listDebtsQuerySchema,
  updateDebtSchema,
  type CreateDebtInput,
  type DebtResponse,
  type ListDebtsQuery,
  type UpdateDebtInput,
} from './debt.schemas.js'
import { toProjectionResponse, toScheduleResponse } from './schedule.presenter.js'
import {
  payoffPlanQuerySchema,
  simulateExtraPaymentSchema,
  type PayoffPlanQuery,
  type PayoffPlanResponse,
  type ProjectionResponse,
  type ScheduleResponse,
  type SimulateExtraPaymentInput,
} from './schedule.schemas.js'

@Controller('debts')
export class DebtsController {
  constructor(
    private readonly listDebts: ListDebtsUseCase,
    private readonly createDebt: CreateDebtUseCase,
    private readonly getDebt: GetDebtUseCase,
    private readonly updateDebt: UpdateDebtUseCase,
    private readonly deleteDebt: DeleteDebtUseCase,
    private readonly getSchedule: GetScheduleUseCase,
    private readonly simulateExtraPayment: SimulateExtraPaymentUseCase,
    private readonly getPayoffPlan: GetPayoffPlanUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listDebtsQuerySchema)) query: ListDebtsQuery,
  ): Promise<Paginated<DebtResponse>> {
    const { items, totalItems } = await this.listDebts.execute(
      query.page,
      query.pageSize,
      query.direction,
    )
    return paginated(items.map(toDebtResponse), query.page, query.pageSize, totalItems)
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createDebtSchema)) input: CreateDebtInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.createDebt.execute(input))
  }

  // Declarado antes de ':id': si no, Nest resolvería 'payoff-plan' como el id de una deuda.
  @Get('payoff-plan')
  async payoffPlan(
    @Query(new ZodValidationPipe(payoffPlanQuerySchema)) query: PayoffPlanQuery,
  ): Promise<PayoffPlanResponse> {
    const orderedIds = query.order ? query.order.split(',') : []
    const debts = await this.getPayoffPlan.execute(query.strategy, orderedIds)
    return {
      strategy: query.strategy,
      order: debts.map((debt) => ({
        id: debt.id,
        name: debt.name,
        balance: fromMoney(debt.balanceAt(new Date())),
        annualRate: debt.rate.annualPercentage.toString(),
        monthlyPayment: fromMoney(
          debt.schedule().installments[0]?.payment ?? debt.principal.multiply(0),
        ),
      })),
    }
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<DebtResponse> {
    return toDebtResponse(await this.getDebt.execute(id))
  }

  @Get(':id/schedule')
  async schedule(@Param('id') id: string): Promise<ScheduleResponse> {
    return toScheduleResponse(await this.getSchedule.execute(id))
  }

  // 200 y no 201: simular no crea nada.
  @Post(':id/simulate')
  @HttpCode(200)
  async simulate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(simulateExtraPaymentSchema)) input: SimulateExtraPaymentInput,
  ): Promise<ProjectionResponse> {
    return toProjectionResponse(await this.simulateExtraPayment.execute(id, input))
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDebtSchema)) input: UpdateDebtInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.updateDebt.execute(id, input))
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteDebt.execute(id)
  }
}
