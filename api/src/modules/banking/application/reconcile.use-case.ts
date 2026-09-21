import { Inject, Injectable } from '@nestjs/common'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import {
  MOVEMENT_REPOSITORY,
  type MovementRepository,
} from '../../accounting/domain/movement-repository.port.js'
import {
  JOURNAL_REPOSITORY,
  type JournalRepository,
} from '../../accounting/domain/journal-repository.port.js'
import type { StoredBankLine } from '../domain/bank-line.js'
import {
  BANK_STATEMENT_REPOSITORY,
  type BankStatementRepository,
} from '../domain/bank-statement-repository.port.js'
import { suggestMatches, type MatchSuggestion } from '../domain/reconciliation.js'
import { ManageBankAccountsUseCase } from './manage-bank-accounts.use-case.js'

export interface Reconciliation {
  readonly bankAccountId: string
  // El saldo de la cuenta contable a la fecha final del rango.
  readonly ledgerBalance: Money
  // La suma de las líneas importadas del rango.
  readonly statementBalance: Money
  readonly difference: Money
  readonly lines: StoredBankLine[]
  // Las que ya se resolvieron en el rango: sin ellas, conciliar una línea por error no tiene vuelta.
  readonly resolved: StoredBankLine[]
  readonly suggestions: MatchSuggestion[]
  readonly totalItems: number
}

const ALL = 1000

@Injectable()
export class ReconcileUseCase {
  constructor(
    @Inject(BANK_STATEMENT_REPOSITORY) private readonly statements: BankStatementRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly accounts: ManageBankAccountsUseCase,
  ) {}

  async execute(
    bankAccountId: string,
    range: DateRange,
    page: number,
    pageSize: number,
  ): Promise<Reconciliation> {
    const account = await this.accounts.find(bankAccountId)
    const currency = account.currency

    const [pending, allLines, totals, movementPage] = await Promise.all([
      this.statements.pendingLines(bankAccountId, range, page, pageSize),
      this.statements.allLines(bankAccountId, range),
      this.journal.totalsUpTo(currency, range.to),
      this.movements.findAll({ status: 'ACTIVE', range }, 1, ALL),
    ])

    // El saldo contable de una cuenta de activo es débitos menos créditos.
    const account_ = totals.find((total) => total.accountCode === account.accountCode)
    const ledgerBalance = Money.fromMinorUnits(
      account_ ? account_.debits - account_.credits : 0n,
      currency,
    )

    const statementBalance = allLines.reduce(
      (acc, line) => unwrap(acc.add(line.amount)),
      Money.zero(currency),
    )

    const candidates = movementPage.items
      .filter((movement) => movement.paymentAccountCode === account.accountCode)
      .map((movement) => ({
        id: movement.id,
        date: movement.date,
        amount: movement.amount,
        receiptUrl: movement.receiptUrl,
        kind: movement.kind,
      }))

    return {
      bankAccountId,
      ledgerBalance,
      statementBalance,
      difference: unwrap(ledgerBalance.subtract(statementBalance)),
      lines: pending.items,
      resolved: allLines.filter((line) => line.status !== 'PENDING'),
      suggestions: suggestMatches(pending.items, candidates),
      totalItems: pending.totalItems,
    }
  }
}
