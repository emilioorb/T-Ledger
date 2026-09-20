export const CURRENCIES = ['CRC', 'USD'] as const

export type CurrencyCode = (typeof CURRENCIES)[number]

export const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = {
  CRC: 2,
  USD: 2,
}

export const isCurrencyCode = (value: string): value is CurrencyCode =>
  (CURRENCIES as readonly string[]).includes(value)
