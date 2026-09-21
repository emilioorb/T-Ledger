import type { CurrencyCode } from '../../../../shared/kernel/currency.js'
import { Money } from '../../../../shared/kernel/money.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import { signedBalance } from '../account-balance.js'
import type { ChartOfAccounts } from '../chart-of-accounts.js'
import type { AccountMovementTotals } from '../journal-repository.port.js'

export interface TrialBalanceRow {
  readonly accountCode: string
  readonly accountName: string
  readonly debits: Money
  readonly credits: Money
  readonly balance: Money
}

export interface TrialBalance {
  readonly rows: TrialBalanceRow[]
  readonly totalDebits: Money
  readonly totalCredits: Money
  readonly difference: Money
  readonly balances: boolean
}

// Solo las cuentas con movimiento en el período. Una comprobación con el plan entero
// sería una lista de ceros con tres filas útiles adentro.
export const buildTrialBalance = (
  totals: readonly AccountMovementTotals[],
  chart: ChartOfAccounts,
  currency: CurrencyCode,
): TrialBalance => {
  const rows: TrialBalanceRow[] = []
  let totalDebits = Money.zero(currency)
  let totalCredits = Money.zero(currency)

  for (const total of [...totals].sort((a, b) => a.accountCode.localeCompare(b.accountCode))) {
    const account = chart.byCode(total.accountCode)
    if (!account) continue

    const debits = Money.fromMinorUnits(total.debits, currency)
    const credits = Money.fromMinorUnits(total.credits, currency)

    rows.push({
      accountCode: account.code,
      accountName: account.name,
      debits,
      credits,
      balance: signedBalance(debits, credits, account.accountClass),
    })

    totalDebits = unwrap(totalDebits.add(debits))
    totalCredits = unwrap(totalCredits.add(credits))
  }

  const difference = unwrap(totalDebits.subtract(totalCredits))

  return { rows, totalDebits, totalCredits, difference, balances: difference.isZero() }
}
