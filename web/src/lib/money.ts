export type CurrencyCode = 'CRC' | 'USD'

export interface MoneyDto {
  minorUnits: string
  currency: CurrencyCode
}

const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = { CRC: 2, USD: 2 }
export const SYMBOL: Record<CurrencyCode, string> = { CRC: '₡', USD: '$' }

// U+202F, espacio fino sin salto: separa los miles y nunca deja que el monto se parta en
// dos renglones. La consecuencia es de diseño, no de formato: un monto es un bloque
// indivisible, y ninguna pista de grilla que aloje un `Amount` puede medir menos de lo que
// mide ese bloque. Medido sobre siete cifras con símbolo y decimales:
//
//   text-sm   ~110 px   filas de tabla y de lista
//   text-2xl  ~185 px   cifras de apoyo
//   text-3xl  ~230 px   la cifra que abre una pantalla
//
// Por eso las pistas de monto van fijas y solo las de texto llevan `minmax(0,…)`: apretar
// una pista de texto recorta un nombre, apretar una de monto lo desborda sin aviso.
const NARROW_SPACE = ' '

// El formateo nunca pasa por Number: un monto en céntimos desborda el entero seguro.
export const formatMoney = (money: MoneyDto): string => {
  const exponent = MINOR_UNIT_EXPONENT[money.currency]
  const negative = money.minorUnits.startsWith('-')
  const digits = (negative ? money.minorUnits.slice(1) : money.minorUnits).padStart(
    exponent + 1,
    '0',
  )
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
  const digits = (negative ? money.minorUnits.slice(1) : money.minorUnits).padStart(
    exponent + 1,
    '0',
  )
  const whole = digits.slice(0, digits.length - exponent)
  const fraction = digits.slice(digits.length - exponent)
  return `${negative ? '-' : ''}${whole},${fraction}`
}
