import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { Category } from './category.js'
import type { ChartOfAccounts } from './chart-of-accounts.js'
import { JournalEntry, type JournalLine } from './journal-entry.js'
import type { Movement } from './movement.js'

// Los asientos vigentes de un movimiento: los que nadie revirtió. Un movimiento editado
// varias veces acumula original, reversión y nuevo asiento, y solo el último está vivo.
export const activeEntriesOf = (entries: readonly JournalEntry[]): JournalEntry[] => {
  const reversed = new Set(
    entries.map((entry) => entry.reversesEntryId).filter((id): id is string => id !== null),
  )
  return entries.filter((entry) => entry.reversesEntryId === null && !reversed.has(entry.id))
}

// Devuelve null cuando el movimiento es válido pero no contabilizable: categoría sin
// cuenta, sin cuenta de pago, o movimiento anulado. No es un error, es un estado.
export const postingFor = (
  movement: Movement,
  category: Category,
  chart: ChartOfAccounts,
  entryId: string,
): Result<JournalEntry | null, RangeError> => {
  if (movement.kind !== category.kind) {
    return err(new RangeError(`El movimiento es ${movement.kind} y su categoría es ${category.kind}`))
  }
  if (movement.isVoided()) return ok(null)
  if (!category.isPostable() || movement.paymentAccountCode === null) return ok(null)

  const categoryAccount = category.accountCode
  if (categoryAccount === null) return ok(null)

  if (!chart.isPostable(categoryAccount)) {
    return err(new RangeError(`La cuenta ${categoryAccount} de la categoría no acepta asientos`))
  }

  // Un gasto debita la cuenta de la categoría y acredita la de pago; un ingreso, al revés.
  const lines: JournalLine[] =
    movement.kind === 'EXPENSE'
      ? [
          { accountCode: categoryAccount, amount: movement.amount, side: 'DEBIT' },
          { accountCode: movement.paymentAccountCode, amount: movement.amount, side: 'CREDIT' },
        ]
      : [
          { accountCode: movement.paymentAccountCode, amount: movement.amount, side: 'DEBIT' },
          { accountCode: categoryAccount, amount: movement.amount, side: 'CREDIT' },
        ]

  const entry = JournalEntry.create(
    {
      id: entryId,
      date: movement.date,
      description: `${category.name} · ${movement.counterparty}`,
      reference: movement.receiptUrl,
      lines,
      sourceMovementId: movement.id,
      reversesEntryId: null,
    },
    chart,
  )

  return entry.ok ? ok(entry.value) : err(entry.error)
}
