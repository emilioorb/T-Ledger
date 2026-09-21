import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { JournalEntry } from '../domain/journal-entry.js'
import type { CreateJournalEntryInput } from '../infrastructure/accounting.schemas.js'
import { PeriodGuard } from './period-guard.js'

@Injectable()
export class CreateJournalEntryUseCase {
  constructor(
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    private readonly guard: PeriodGuard,
  ) {}

  async execute(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const date = new Date(`${input.date}T00:00:00.000Z`)
    await this.guard.assertOpen(date)

    const chart = await this.accounts.loadChart()
    const entry = JournalEntry.create(
      {
        id: randomUUID(),
        date,
        description: input.description,
        reference: input.reference,
        lines: input.lines.map((line) => ({
          accountCode: line.accountCode,
          amount: toMoney(line.amount),
          side: line.side,
        })),
        sourceMovementId: null,
        reversesEntryId: null,
      },
      chart,
    )
    if (isErr(entry)) throw new SemanticValidationError(entry.error.message)

    await this.journal.save(entry.value)
    return entry.value
  }
}
