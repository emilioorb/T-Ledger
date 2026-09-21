import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ManageGoalsUseCase } from '../application/manage-goals.use-case.js'
import { toGoalResponse } from './goals.presenters.js'
import {
  createContributionSchema,
  createGoalSchema,
  updateGoalSchema,
  type CreateContributionInput,
  type CreateGoalInput,
  type UpdateGoalInput,
} from './goals.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type GoalResponse = ReturnType<typeof toGoalResponse>

@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: ManageGoalsUseCase) {}

  @Get()
  async list(): Promise<GoalResponse[]> {
    const at = new Date()
    return (await this.goals.list()).map((goal) => toGoalResponse(goal, at))
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.find(id), new Date())
  }

  @Permiso('meta', 'write')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createGoalSchema)) input: CreateGoalInput,
  ): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.create(input), new Date())
  }

  @Permiso('meta', 'write')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGoalSchema)) input: UpdateGoalInput,
  ): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.update(id, input), new Date())
  }

  @Permiso('meta', 'write')
  @Post(':id/contributions')
  @HttpCode(201)
  async contribute(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createContributionSchema)) input: CreateContributionInput,
  ): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.contribute(id, input), new Date())
  }

  @Permiso('meta', 'write')
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    await this.goals.delete(id)
  }
}
