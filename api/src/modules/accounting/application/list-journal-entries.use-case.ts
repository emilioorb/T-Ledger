import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import {
  JOURNAL_REPOSITORY,
  type JournalPage,
  type JournalRepository,
} from '../domain/journal-repository.port.js'
import type { JournalEntry } from '../domain/journal-entry.js'

@Injectable()
export class ListJournalEntriesUseCase {
  constructor(@Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository) {}

  async execute(range: DateRange, page: number, pageSize: number): Promise<JournalPage> {
    return this.journal.findInRange(range, page, pageSize)
  }

  async byId(id: string): Promise<JournalEntry> {
    const entry = await this.journal.findById(id)
    if (!entry) throw new NotFoundError(`El asiento ${id} no existe.`)
    return entry
  }
}
