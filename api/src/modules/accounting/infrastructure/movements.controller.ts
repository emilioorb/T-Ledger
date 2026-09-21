import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { CreateMovementUseCase, type PostedMovement } from '../application/create-movement.use-case.js'
import { ListMovementsUseCase } from '../application/list-movements.use-case.js'
import { UpdateMovementUseCase } from '../application/update-movement.use-case.js'
import { VoidMovementUseCase } from '../application/void-movement.use-case.js'
import type { MovementFilters } from '../domain/movement-repository.port.js'
import { toMovementResponse } from './accounting.presenters.js'
import {
  createMovementSchema,
  listMovementsQuerySchema,
  updateMovementSchema,
  type CreateMovementInput,
  type ListMovementsQuery,
  type UpdateMovementInput,
} from './accounting.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type MovementResponse = ReturnType<typeof toMovementResponse>

const present = ({ movement, journalEntryId }: PostedMovement): MovementResponse =>
  toMovementResponse(movement, journalEntryId)

const rangeOf = (query: ListMovementsQuery): DateRange | undefined => {
  if (!query.from || !query.to) return undefined
  const range = DateRange.create(
    new Date(`${query.from}T00:00:00.000Z`),
    new Date(`${query.to}T00:00:00.000Z`),
  )
  if (isErr(range)) throw new SemanticValidationError(range.error.message)
  return range.value
}

@Controller('movements')
export class MovementsController {
  constructor(
    private readonly listMovements: ListMovementsUseCase,
    private readonly createMovement: CreateMovementUseCase,
    private readonly updateMovement: UpdateMovementUseCase,
    private readonly voidMovement: VoidMovementUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listMovementsQuerySchema)) query: ListMovementsQuery,
  ): Promise<Paginated<MovementResponse>> {
    const range = rangeOf(query)
    const filters: MovementFilters = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(range ? { range } : {}),
      ...(query.search ? { search: query.search } : {}),
    }

    const { items, totalItems } = await this.listMovements.execute(
      filters,
      query.page,
      query.pageSize,
    )
    return paginated(items.map(present), query.page, query.pageSize, totalItems)
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<MovementResponse> {
    return present(await this.listMovements.byId(id))
  }

  @Permiso('movimiento', 'create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createMovementSchema)) input: CreateMovementInput,
  ): Promise<MovementResponse> {
    return present(await this.createMovement.execute(input))
  }

  @Permiso('movimiento', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMovementSchema)) input: UpdateMovementInput,
  ): Promise<MovementResponse> {
    return present(await this.updateMovement.execute(id, input))
  }

  // 200 y no 201: anular no crea un movimiento, marca el que ya existía.
  @Permiso('movimiento', 'create')
  @Post(':id/void')
  @HttpCode(200)
  async void(@Param('id') id: string): Promise<MovementResponse> {
    return present(await this.voidMovement.execute(id))
  }
}
