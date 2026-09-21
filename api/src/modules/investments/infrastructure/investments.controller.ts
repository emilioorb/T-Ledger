import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ManageInvestmentsUseCase } from '../application/manage-investments.use-case.js'
import { toInvestmentResponse } from './investments.presenters.js'
import {
  createInvestmentSchema,
  investmentContributionSchema,
  listInvestmentsQuerySchema,
  projectionQuerySchema,
  updateInvestmentSchema,
  type CreateInvestmentInput,
  type InvestmentContributionInput,
  type ListInvestmentsQuery,
  type ProjectionQuery,
  type UpdateInvestmentInput,
} from './investments.schemas.js'

type InvestmentResponse = ReturnType<typeof toInvestmentResponse>

const utc = (date: string): Date => new Date(`${date}T00:00:00.000Z`)

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investments: ManageInvestmentsUseCase) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listInvestmentsQuerySchema)) query: ListInvestmentsQuery,
  ): Promise<InvestmentResponse[]> {
    const at = query.at ? utc(query.at) : new Date()
    return (await this.investments.list()).map((investment) => toInvestmentResponse(investment, at))
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<InvestmentResponse> {
    return toInvestmentResponse(await this.investments.find(id), new Date())
  }

  // El valor a una fecha futura es la pregunta que una inversión existe para responder.
  @Get(':id/projection')
  async projection(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(projectionQuerySchema)) query: ProjectionQuery,
  ): Promise<InvestmentResponse> {
    return toInvestmentResponse(await this.investments.find(id), utc(query.at))
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createInvestmentSchema)) input: CreateInvestmentInput,
  ): Promise<InvestmentResponse> {
    return toInvestmentResponse(await this.investments.create(input), new Date())
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInvestmentSchema)) input: UpdateInvestmentInput,
  ): Promise<InvestmentResponse> {
    return toInvestmentResponse(await this.investments.update(id, input), new Date())
  }

  @Post(':id/contributions')
  @HttpCode(201)
  async contribute(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(investmentContributionSchema)) input: InvestmentContributionInput,
  ): Promise<InvestmentResponse> {
    return toInvestmentResponse(await this.investments.contribute(id, input), new Date())
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    await this.investments.delete(id)
  }
}
