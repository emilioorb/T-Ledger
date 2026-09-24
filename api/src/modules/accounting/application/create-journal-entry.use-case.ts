import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
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
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  // Como el alta de un movimiento: el mes abierto y el plan se leen dentro del candado del libro.
  execute(input: CreateJournalEntryInput): Promise<JournalEntry> {
    return this.transaction.withTransaction(() => this.asentar(input))
  }

  private async asentar(input: CreateJournalEntryInput): Promise<JournalEntry> {
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
