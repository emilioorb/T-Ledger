export type CurrencyCode = 'CRC' | 'USD'

export interface MoneyDto {
  minorUnits: string
  currency: CurrencyCode
}

const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = { CRC: 2, USD: 2 }
const SYMBOL: Record<CurrencyCode, string> = { CRC: '₡', USD: '$' }
const NARROW_SPACE = ' '

// El formateo nunca pasa por Number: un monto en céntimos desborda el entero seguro.
export const formatMoney = (money: MoneyDto): string => {
  const exponent = MINOR_UNIT_EXPONENT[money.currency]
  const negative = money.minorUnits.startsWith('-')
  const digits = (negative ? money.minorUnits.slice(1) : money.minorUnits).padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent)
  const fraction = digits.slice(digits.length - exponent)
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_SPACE)
  return `${negative ? '-' : ''}${SYMBOL[money.currency]}${grouped},${fraction}`
}

export const absMoney = (money: MoneyDto): MoneyDto =>
  money.minorUnits.startsWith('-') ? { ...money, minorUnits: money.minorUnits.slice(1) } : money

export const parseMoneyInput = (text: string, currency: CurrencyCode): MoneyDto => {
  const cleaned = text.replace(/[\s .]/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new RangeError(`No se pudo leer «${text}» como un monto`)
  }
  const [whole = '0', fraction = ''] = cleaned.split('.')
  const exponent = MINOR_UNIT_EXPONENT[currency]
  const negative = whole.startsWith('-')
  const absWhole = negative ? whole.slice(1) : whole
  const minor = `${absWhole}${fraction.padEnd(exponent, '0')}`.replace(/^0+(?=\d)/, '')
  return { minorUnits: `${negative ? '-' : ''}${minor}`, currency }
}

// El valor que vuelve a un campo de texto: sin símbolo ni separadores de miles, porque
// lo que se edita es un número, no un monto ya compuesto. Es la inversa de parseMoneyInput.
export const toMoneyInput = (money: MoneyDto): string => {
  const exponent = MINOR_UNIT_EXPONENT[money.currency]
  const negative = money.minorUnits.startsWith('-')
  const digits = (negative ? money.minorUnits.slice(1) : money.minorUnits).padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent)
  const fraction = digits.slice(digits.length - exponent)
  return `${negative ? '-' : ''}${whole},${fraction}`
}
