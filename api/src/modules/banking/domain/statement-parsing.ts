import { toUtcDate } from '../../../shared/kernel/calendar.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { ParsedLine } from './bank-line.js'
import { parseCsv } from './csv.js'
import type { CsvDateFormat, ImportProfile } from './import-profile.js'

const cellAt = (row: readonly string[], index: number): string => (row[index] ?? '').trim()

// `toUtcDate` devuelve null si la fecha no existe. Es lo que delata el archivo que viene en
// mm/dd cuando el perfil dice DD/MM: 02/14/2026 deja de importarse como 2 de febrero.
const parseDate = (value: string, format: CsvDateFormat): Date | null => {
  if (format === 'DD/MM/YYYY') {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    return match ? toUtcDate(Number(match[3]), Number(match[2]), Number(match[1])) : null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? toUtcDate(Number(match[1]), Number(match[2]), Number(match[3])) : null
}

const parseAmount = (
  value: string,
  profile: ImportProfile,
  currency: CurrencyCode,
): Money | null => {
  const withoutThousands = profile.thousandsSeparator
    ? value.split(profile.thousandsSeparator).join('')
    : value
  const normalized = withoutThousands.replace(profile.decimalSeparator, '.').replace(/\s/g, '')

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Money.fromDecimal(normalized, currency)
}

// El débito del banco es plata que sale de la cuenta: entra negativa al extracto, para que el
// signo signifique lo mismo venga de una columna o de dos.
const amountOf = (
  row: readonly string[],
  profile: ImportProfile,
  currency: CurrencyCode,
): Money | null => {
  if (profile.amountColumn !== null) {
    return parseAmount(cellAt(row, profile.amountColumn), profile, currency)
  }
  if (profile.debitColumn === null || profile.creditColumn === null) return null

  // En el par débito/crédito la celda vacía es la columna que no aplica, y ahí sí vale cero.
  // En la columna única de monto no: vacía significa que la fila no se pudo leer.
  const zeroIfBlank = (cell: string): Money | null =>
    cell === '' ? Money.zero(currency) : parseAmount(cell, profile, currency)

  const debit = zeroIfBlank(cellAt(row, profile.debitColumn))
  const credit = zeroIfBlank(cellAt(row, profile.creditColumn))
  if (!debit || !credit) return null

  return credit.isZero() ? debit.negate() : credit
}

const columnsNeeded = (profile: ImportProfile): number =>
  Math.max(
    profile.dateColumn,
    profile.descriptionColumn,
    profile.referenceColumn ?? 0,
    profile.amountColumn ?? 0,
    profile.debitColumn ?? 0,
    profile.creditColumn ?? 0,
  ) + 1

// El error nombra la fila y la columna: «formato inválido» obliga a abrir el CSV y adivinar.
export const parseStatement = (
  text: string,
  profile: ImportProfile,
  currency: CurrencyCode,
): Result<ParsedLine[], RangeError> => {
  const parsed = parseCsv(text, profile.delimiter)
  if (!parsed.ok) return parsed

  const rows = parsed.value.slice(profile.headerRows)
  const needed = columnsNeeded(profile)
  const lines: ParsedLine[] = []

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + profile.headerRows + 1
    if (row.every((cell) => cell.trim() === '')) continue

    if (row.length < needed) {
      return err(
        new RangeError(
          `La fila ${rowNumber} tiene ${row.length} columnas y el perfil espera ${needed}`,
        ),
      )
    }

    const date = parseDate(cellAt(row, profile.dateColumn), profile.dateFormat)
    if (!date) {
      return err(
        new RangeError(`La fecha de la fila ${rowNumber} no coincide con ${profile.dateFormat}`),
      )
    }

    const amount = amountOf(row, profile, currency)
    if (!amount) {
      return err(new RangeError(`El Monto de la fila ${rowNumber} no se pudo leer`))
    }

    lines.push({
      date,
      description: cellAt(row, profile.descriptionColumn),
      reference:
        profile.referenceColumn === null ? null : cellAt(row, profile.referenceColumn) || null,
      amount,
    })
  }

  return ok(lines)
}
