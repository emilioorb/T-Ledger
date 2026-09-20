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
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { CreateDebtUseCase } from '../application/create-debt.use-case.js'
import { DeleteDebtUseCase } from '../application/delete-debt.use-case.js'
import { GetDebtUseCase } from '../application/get-debt.use-case.js'
import { ListDebtsUseCase } from '../application/list-debts.use-case.js'
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

@Controller('debts')
export class DebtsController {
  constructor(
    private readonly listDebts: ListDebtsUseCase,
    private readonly createDebt: CreateDebtUseCase,
    private readonly getDebt: GetDebtUseCase,
    private readonly updateDebt: UpdateDebtUseCase,
    private readonly deleteDebt: DeleteDebtUseCase,
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

  @Get(':id')
  async get(@Param('id') id: string): Promise<DebtResponse> {
    return toDebtResponse(await this.getDebt.execute(id))
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
