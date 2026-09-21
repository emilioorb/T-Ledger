import { Inject, Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import type { PeriodKey } from '../../accounting/domain/accounting-period.js'
import {
  JOURNAL_REPOSITORY,
  type JournalRepository,
} from '../../accounting/domain/journal-repository.port.js'
import type { CategorizedSpending } from '../domain/categorized-spending.js'

export interface BucketAccountMapping {
  readonly bucketId: string
  readonly accountCodes: readonly string[]
}

// La costura donde el presupuesto deja de ser teoría: el gasto de cada cubeta no se
// declara, se lee de los asientos del período.
@Injectable()
export class AccountingSpendingProvider {
  constructor(@Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository) {}

  async spendingFor(
    period: PeriodKey,
    currency: CurrencyCode,
    mapping: readonly BucketAccountMapping[],
  ): Promise<CategorizedSpending> {
    const totals = await this.journal.totalsByAccount(currency, period.range())
    const byAccount = new Map(totals.map((total) => [total.accountCode, total]))

    const byBucket = new Map<string, Money>()
    for (const { bucketId, accountCodes } of mapping) {
      // El consumo es el saldo neto de las cuentas de gasto: un reintegro lo baja.
      const consumed = accountCodes.reduce((acc, code) => {
        const account = byAccount.get(code)
        if (!account) return acc
        return acc + account.debits - account.credits
      }, 0n)
      byBucket.set(bucketId, Money.fromMinorUnits(consumed, currency))
    }

    return {
      amountFor: (bucketId) => byBucket.get(bucketId) ?? Money.zero(currency),
    }
  }
}
