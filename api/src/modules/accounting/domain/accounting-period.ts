import { DateRange } from '../../../shared/kernel/date-range.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'

export type PeriodStatus = 'OPEN' | 'CLOSED'

const lastDayOf = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

export class PeriodKey {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  static of(year: number, month: number): Result<PeriodKey, RangeError> {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
      return err(new RangeError(`Año fuera de rango: ${year}`))
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return err(new RangeError(`Mes fuera de rango: ${month}`))
    }
    return ok(new PeriodKey(year, month))
  }

  static fromDate(date: Date): PeriodKey {
    return new PeriodKey(date.getUTCFullYear(), date.getUTCMonth() + 1)
  }

  static parse(text: string): Result<PeriodKey, RangeError> {
    const match = /^(\d{4})-(\d{2})$/.exec(text)
    if (!match) return err(new RangeError(`El período debe ser AAAA-MM, se recibió «${text}»`))
    return PeriodKey.of(Number(match[1]), Number(match[2]))
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`
  }

  previous(): PeriodKey {
    return this.month === 1
      ? new PeriodKey(this.year - 1, 12)
      : new PeriodKey(this.year, this.month - 1)
  }

  next(): PeriodKey {
    return this.month === 12
      ? new PeriodKey(this.year + 1, 1)
      : new PeriodKey(this.year, this.month + 1)
  }

  compareTo(other: PeriodKey): number {
    if (this.year !== other.year) return this.year < other.year ? -1 : 1
    if (this.month !== other.month) return this.month < other.month ? -1 : 1
    return 0
  }

  range(): DateRange {
    return unwrap(
      DateRange.create(
        new Date(Date.UTC(this.year, this.month - 1, 1)),
        new Date(Date.UTC(this.year, this.month - 1, lastDayOf(this.year, this.month))),
      ),
    )
  }

  contains(date: Date): boolean {
    return this.range().contains(date)
  }
}

export class AccountingPeriod {
  private constructor(
    readonly key: PeriodKey,
    readonly status: PeriodStatus,
    readonly closedAt: Date | null,
  ) {}

  static open(key: PeriodKey): AccountingPeriod {
    return new AccountingPeriod(key, 'OPEN', null)
  }

  static restore(key: PeriodKey, status: PeriodStatus, closedAt: Date | null): AccountingPeriod {
    return new AccountingPeriod(key, status, closedAt)
  }

  isClosed(): boolean {
    return this.status === 'CLOSED'
  }

  close(at: Date): AccountingPeriod {
    return new AccountingPeriod(this.key, 'CLOSED', at)
  }

  reopen(): AccountingPeriod {
    return new AccountingPeriod(this.key, 'OPEN', null)
  }
}
