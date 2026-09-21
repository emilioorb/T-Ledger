import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { isErr } from '../../../shared/kernel/result.js'
import { CreateJournalEntryUseCase } from '../application/create-journal-entry.use-case.js'
import { ListJournalEntriesUseCase } from '../application/list-journal-entries.use-case.js'
import { toJournalEntryResponse } from './accounting.presenters.js'
import {
  createJournalEntrySchema,
  listJournalEntriesQuerySchema,
  type CreateJournalEntryInput,
  type ListJournalEntriesQuery,
} from './accounting.schemas.js'

type JournalEntryResponse = ReturnType<typeof toJournalEntryResponse>

// No hay DELETE, y esa ausencia es la regla: un asiento registrado no se borra, se anula.
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(
    private readonly listEntries: ListJournalEntriesUseCase,
    private readonly createEntry: CreateJournalEntryUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listJournalEntriesQuerySchema)) query: ListJournalEntriesQuery,
  ): Promise<Paginated<JournalEntryResponse>> {
    const range = DateRange.create(
      new Date(`${query.from}T00:00:00.000Z`),
      new Date(`${query.to}T00:00:00.000Z`),
    )
    if (isErr(range)) throw new SemanticValidationError(range.error.message)

    const { items, totalItems } = await this.listEntries.execute(
      range.value,
      query.page,
      query.pageSize,
    )
    return paginated(items.map(toJournalEntryResponse), query.page, query.pageSize, totalItems)
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<JournalEntryResponse> {
    return toJournalEntryResponse(await this.listEntries.byId(id))
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createJournalEntrySchema)) input: CreateJournalEntryInput,
  ): Promise<JournalEntryResponse> {
    return toJournalEntryResponse(await this.createEntry.execute(input))
  }
}
