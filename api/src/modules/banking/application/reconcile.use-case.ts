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
  // Lo que se movió en la cuenta contable dentro del rango: débitos menos créditos.
  readonly ledgerMovement: Money
  // Lo que el banco reportó dentro del mismo rango.
  readonly statementMovement: Money
  // Las dos cosas miden el mismo período. Antes el saldo contable venía acumulado desde el
  // inicio de los tiempos y el del extracto acotado al rango: conciliar octubre con todo
  // perfecto daba como diferencia el saldo de setiembre, y no había saldo inicial que lo
  // compensara. El único test corría sobre una base recién creada, el caso donde no se ve.
  readonly difference: Money
  readonly lines: StoredBankLine[]
  // La suma de TODAS las pendientes del rango, no solo las de la página: es lo que permite
  // decir si las pendientes explican la diferencia sin depender de cuántas se estén viendo.
  readonly pendingTotal: Money
  // Las que ya se resolvieron en el rango: sin ellas, conciliar una línea por error no tiene vuelta.
  readonly resolved: StoredBankLine[]
  readonly suggestions: MatchSuggestion[]
  readonly totalItems: number
}

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

    const [pending, allLines, totals, movementsOfAccount] = await Promise.all([
      this.statements.pendingLines(bankAccountId, range, page, pageSize),
      this.statements.allLines(bankAccountId, range),
      this.journal.totalsByAccount(currency, range),
      this.movements.findByPaymentAccount(account.accountCode, range),
    ])

    // Lo que entró menos lo que salió de una cuenta de activo son sus débitos menos sus créditos.
    const account_ = totals.find((total) => total.accountCode === account.accountCode)
    const ledgerMovement = Money.fromMinorUnits(
      account_ ? account_.debits - account_.credits : 0n,
      currency,
    )

    const statementMovement = allLines.reduce(
      (acc, line) => unwrap(acc.add(line.amount)),
      Money.zero(currency),
    )

    const candidates = movementsOfAccount.map((movement) => ({
      id: movement.id,
      date: movement.date,
      amount: movement.amount,
      receiptUrl: movement.receiptUrl,
      kind: movement.kind,
    }))

    return {
      bankAccountId,
      ledgerMovement,
      statementMovement,
      difference: unwrap(ledgerMovement.subtract(statementMovement)),
      lines: pending.items,
      pendingTotal: allLines
        .filter((line) => line.status === 'PENDING')
        .reduce((acc, line) => unwrap(acc.add(line.amount)), Money.zero(currency)),
      resolved: allLines.filter((line) => line.status !== 'PENDING'),
      suggestions: suggestMatches(pending.items, candidates),
      totalItems: pending.totalItems,
    }
  }
}
