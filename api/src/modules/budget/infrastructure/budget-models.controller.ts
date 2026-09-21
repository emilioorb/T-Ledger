import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ManageBudgetModelsUseCase } from '../application/manage-budget-models.use-case.js'
import { toModelResponse } from './budget.presenters.js'
import { budgetModelSchema, type BudgetModelInput } from './budget.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type ModelResponse = ReturnType<typeof toModelResponse>

@Controller('budget-models')
export class BudgetModelsController {
  constructor(private readonly models: ManageBudgetModelsUseCase) {}

  @Get()
  async list(): Promise<ModelResponse[]> {
    const { models, activeId } = await this.models.list()
    return Promise.all(
      models.map(async (model) =>
        toModelResponse(model, model.id === activeId, await this.models.mappingFor(model.id)),
      ),
    )
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ModelResponse> {
    const model = await this.models.find(id)
    const { activeId } = await this.models.list()
    return toModelResponse(model, model.id === activeId, await this.models.mappingFor(id))
  }

  @Permiso('presupuesto', 'write')
  @Post()
  async create(
    @Body(new ZodValidationPipe(budgetModelSchema)) input: BudgetModelInput,
  ): Promise<ModelResponse> {
    const model = await this.models.create(input)
    return toModelResponse(model, input.active, await this.models.mappingFor(model.id))
  }

  @Permiso('presupuesto', 'write')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(budgetModelSchema)) input: BudgetModelInput,
  ): Promise<ModelResponse> {
    const model = await this.models.update(id, input)
    return toModelResponse(model, input.active, await this.models.mappingFor(id))
  }
}
