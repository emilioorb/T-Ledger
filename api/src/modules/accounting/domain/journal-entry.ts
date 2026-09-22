import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import type { ChartOfAccounts } from './chart-of-accounts.js'

export type EntrySide = 'DEBIT' | 'CREDIT'

export interface JournalLine {
  readonly accountCode: string
  readonly amount: Money
  readonly side: EntrySide
}

export interface JournalEntryProps {
  readonly id: string
  readonly date: Date
  readonly description: string
  readonly reference: string | null
  readonly lines: readonly JournalLine[]
  readonly sourceMovementId: string | null
  readonly reversesEntryId: string | null
}

const MIN_LINES = 2

const currenciesOf = (lines: readonly JournalLine[]): CurrencyCode[] =>
  [...new Set(lines.map((line) => line.amount.currency))].sort()

const totalOf = (lines: readonly JournalLine[], currency: CurrencyCode, side: EntrySide): Money =>
  lines
    .filter((line) => line.amount.currency === currency && line.side === side)
    .reduce((acc, line) => unwrap(acc.add(line.amount)), Money.zero(currency))

export class JournalEntry {
  private constructor(private readonly props: JournalEntryProps) {}

  static create(
    props: JournalEntryProps,
    chart: ChartOfAccounts,
  ): Result<JournalEntry, RangeError> {
    if (props.lines.length < MIN_LINES) {
      return err(new RangeError('Un asiento necesita al menos dos líneas'))
    }
    if (props.description.trim().length === 0) {
      return err(new RangeError('El asiento necesita una descripción'))
    }

    for (const line of props.lines) {
      if (line.amount.isZero() || line.amount.isNegative()) {
        return err(
          new RangeError(`La línea contra ${line.accountCode} debe tener un monto mayor que cero`),
        )
      }
      if (!chart.byCode(line.accountCode)) {
        return err(new RangeError(`La cuenta ${line.accountCode} no existe en el plan`))
      }
      if (!chart.isPostable(line.accountCode)) {
        return err(
          new RangeError(
            `La cuenta ${line.accountCode} no acepta asientos: es agrupadora o está inactiva`,
          ),
        )
      }
    }

    // La invariante es por moneda. Un asiento de conversión cuadra en colones por un lado
    // y en dólares por el otro; su total mezclado no significa nada.
    for (const currency of currenciesOf(props.lines)) {
      const debits = totalOf(props.lines, currency, 'DEBIT')
      const credits = totalOf(props.lines, currency, 'CREDIT')
      if (!debits.equals(credits)) {
        return err(
          new RangeError(
            `El asiento no cuadra en ${currency}: débitos ${debits.minorUnits} contra créditos ${credits.minorUnits}`,
          ),
        )
      }
    }

    return ok(new JournalEntry({ ...props, description: props.description.trim() }))
  }

  get id(): string {
    return this.props.id
  }
  get date(): Date {
    return this.props.date
  }
  get description(): string {
    return this.props.description
  }
  get reference(): string | null {
    return this.props.reference
  }
  get lines(): readonly JournalLine[] {
    return this.props.lines
  }
  get sourceMovementId(): string | null {
    return this.props.sourceMovementId
  }
  get reversesEntryId(): string | null {
    return this.props.reversesEntryId
  }

  currencies(): CurrencyCode[] {
    return currenciesOf(this.props.lines)
  }

  totalFor(currency: CurrencyCode, side: EntrySide): Money {
    return totalOf(this.props.lines, currency, side)
  }

  linesFor(accountCode: string, currency: CurrencyCode): JournalLine[] {
    return this.props.lines.filter(
      (line) => line.accountCode === accountCode && line.amount.currency === currency,
    )
  }

  // Anular no borra: se registra el espejo, y los dos quedan en el mayor.
  reverse(id: string, at: Date): JournalEntry {
    const flipped: JournalLine[] = this.props.lines.map((line) => ({
      accountCode: line.accountCode,
      amount: line.amount,
      side: line.side === 'DEBIT' ? 'CREDIT' : 'DEBIT',
    }))

    return new JournalEntry({
      id,
      date: at,
      description: `Reversión de: ${this.props.description}`,
      reference: this.props.reference,
      lines: flipped,
      sourceMovementId: this.props.sourceMovementId,
      reversesEntryId: this.props.id,
    })
  }

  toProps(): JournalEntryProps {
    return { ...this.props, lines: [...this.props.lines] }
  }
}
