import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { ParsedLine } from './bank-line.js'
import { parseCsv } from './csv.js'
import type { CsvDateFormat, ImportProfile } from './import-profile.js'

const cellAt = (row: readonly string[], index: number): string => (row[index] ?? '').trim()

const parseDate = (value: string, format: CsvDateFormat): Date | null => {
  if (format === 'DD/MM/YYYY') {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    return match
      ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
      : null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null
}

const parseAmount = (
  value: string,
  profile: ImportProfile,
  currency: CurrencyCode,
): Money | null => {
  if (value === '') return Money.zero(currency)

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

  const debit = parseAmount(cellAt(row, profile.debitColumn), profile, currency)
  const credit = parseAmount(cellAt(row, profile.creditColumn), profile, currency)
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
  const rows = parseCsv(text, profile.delimiter).slice(profile.headerRows)
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
