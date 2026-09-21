import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../../shared/kernel/currency.js'
import { Money } from '../../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../../shared/kernel/result.js'
import { signedBalance } from '../account-balance.js'
import type { AccountClass } from '../account-class.js'
import type { ChartOfAccounts } from '../chart-of-accounts.js'
import type { AccountMovementTotals, DailyAccountTotals } from '../journal-repository.port.js'
import { rateKey } from '../valuation-rate.port.js'

export class MissingRateError extends Error {
  constructor(
    readonly currency: CurrencyCode,
    readonly date: Date,
  ) {
    super(
      `No hay tipo de cambio publicado para valuar ${currency} al ${rateKey(date)}. ` +
        'Sincronizá los tipos de cambio de esa fecha antes de consolidar el patrimonio.',
    )
    this.name = 'MissingRateError'
  }
}

export interface CurrencyInput {
  readonly currency: CurrencyCode
  // El acumulado hasta la fecha, por cuenta.
  readonly closing: readonly AccountMovementTotals[]
  // El mismo acumulado partido por día, para valuar lo que entró a la tasa del día en que entró.
  readonly daily: readonly DailyAccountTotals[]
  readonly closingRate: Decimal | null
  readonly dailyRates: ReadonlyMap<string, Decimal>
}

export interface NetWorthInput {
  readonly at: Date
  readonly presentationCurrency: CurrencyCode
  readonly chart: ChartOfAccounts
  readonly currencies: readonly CurrencyInput[]
}

export interface CurrencyBreakdown {
  readonly currency: CurrencyCode
  readonly rate: string
  // Lo que se tiene en esa moneda, sin el puente: el puente no es una tenencia.
  readonly netWorthNative: Money
  readonly netWorthTranslated: Money
}

// El desglose no lleva su propio diferencial a propósito: el patrimonio de los libros está en
// una sola moneda, así que repartir el efecto cambiario por moneda daría cifras que no suman
// el total. Separar lo realizado de lo no realizado es otro reporte.
export interface NetWorth {
  readonly at: Date
  readonly currency: CurrencyCode
  readonly assets: Money
  readonly liabilities: Money
  // Lo que dicen los libros: cada aporte y cada resultado valuado al día en que ocurrió.
  readonly equity: Money
  readonly netWorth: Money
  readonly exchangeDifference: Money
  readonly balances: boolean
  readonly byCurrency: CurrencyBreakdown[]
}

const ZERO = new Decimal(0)

const isResultClass = (accountClass: AccountClass): boolean =>
  accountClass === 'INCOME' ||
  accountClass === 'COST_OF_REVENUE' ||
  accountClass === 'OPERATING_EXPENSE'

// El resultado del período se suma al patrimonio: la misma línea derivada con la que el estado
// de situación cuadra sin asientos de cierre. Un ingreso suma; un gasto y un costo restan.
const resultSign = (accountClass: AccountClass): number => (accountClass === 'INCOME' ? 1 : -1)

interface Slices {
  // Activo menos pasivo de las cuentas que sí son tenencias.
  held: Decimal
  // La cuenta puente: ni tenencia ni deuda, solo el tránsito de una conversión.
  bridge: Decimal
  // Patrimonio más resultado del período.
  equity: Decimal
}

const emptySlices = (): Slices => ({ held: ZERO, bridge: ZERO, equity: ZERO })

// Reparte los totales de un conjunto de cuentas en las tres piezas que el reporte necesita.
// Las cuentas que reciben asientos son siempre hojas, así que sumarlas directamente da el
// total de cada pieza sin tener que acumular el árbol.
const slicesOf = (
  totals: readonly { accountCode: string; debits: bigint; credits: bigint }[],
  chart: ChartOfAccounts,
  currency: CurrencyCode,
): Slices => {
  const slices = emptySlices()

  for (const total of totals) {
    const account = chart.byCode(total.accountCode)
    if (!account) continue

    const signed = signedBalance(
      Money.fromMinorUnits(total.debits, currency),
      Money.fromMinorUnits(total.credits, currency),
      account.accountClass,
    ).toDecimal()

    if (account.isCurrencyBridge) slices.bridge = slices.bridge.plus(signed)
    else if (account.accountClass === 'ASSET') slices.held = slices.held.plus(signed)
    else if (account.accountClass === 'LIABILITY') slices.held = slices.held.minus(signed)
    else if (account.accountClass === 'EQUITY') slices.equity = slices.equity.plus(signed)
    else if (isResultClass(account.accountClass)) {
      slices.equity = slices.equity.plus(signed.mul(resultSign(account.accountClass)))
    }
  }

  return slices
}

const groupByDay = (totals: readonly DailyAccountTotals[]): Map<string, DailyAccountTotals[]> => {
  const byDay = new Map<string, DailyAccountTotals[]>()
  for (const total of totals) {
    const key = rateKey(total.date)
    byDay.set(key, [...(byDay.get(key) ?? []), total])
  }
  return byDay
}

interface Valued {
  readonly breakdown: CurrencyBreakdown
  readonly assets: Decimal
  readonly liabilities: Decimal
  readonly equityHistorical: Decimal
  readonly balances: boolean
}

const valueCurrency = (
  input: CurrencyInput,
  chart: ChartOfAccounts,
  at: Date,
  presentation: CurrencyCode,
): Result<Valued, MissingRateError> => {
  if (input.closingRate === null) return err(new MissingRateError(input.currency, at))
  const rate = input.closingRate

  const closing = slicesOf(input.closing, chart, input.currency)

  // Lo que pusiste, valuado cuando lo pusiste. Comparar contra el patrimonio traducido a la
  // tasa de hoy escondería el efecto: un aporte en dólares subiría solo porque subió la tasa.
  let equityHistorical = ZERO
  for (const [key, ofDay] of groupByDay(input.daily)) {
    const dayRate = input.dailyRates.get(key)
    if (!dayRate) return err(new MissingRateError(input.currency, ofDay[0]?.date ?? at))
    equityHistorical = equityHistorical.plus(slicesOf(ofDay, chart, input.currency).equity.mul(dayRate))
  }

  // El libro de cada moneda cuadra por separado: tenencias más tránsito es patrimonio. Si
  // esto falla no es un problema de redondeo, es un asiento mal armado.
  const balances = closing.held.plus(closing.bridge).equals(closing.equity)

  // El puente queda fuera de la valuación: sus dos lados son la misma conversión contada en
  // dos monedas, y valuarlos por separado a la tasa de hoy inventaría una ganancia sobre una
  // conversión ya cerrada. Lo que quedó de esa conversión ya está en la moneda que entró.
  const assets = closing.held.greaterThan(0) ? closing.held : ZERO
  const liabilities = closing.held.lessThan(0) ? closing.held.negated() : ZERO
  const translated = closing.held.mul(rate)

  return ok({
    assets: assets.mul(rate),
    liabilities: liabilities.mul(rate),
    equityHistorical,
    balances,
    breakdown: {
      currency: input.currency,
      rate: rate.toString(),
      netWorthNative: Money.fromDecimal(closing.held, input.currency),
      netWorthTranslated: Money.fromDecimal(translated, presentation),
    },
  })
}

// Un solo número para dos libros que no se suman. El patrimonio consolidado es lo que tenés
// hoy; los libros dicen lo que pusiste, valuado cuando lo pusiste; la diferencia entre los dos
// es lo que hizo el tipo de cambio y ningún asiento reconoce todavía.
export const buildNetWorth = (input: NetWorthInput): Result<NetWorth, MissingRateError> => {
  const valued: Valued[] = []

  for (const currency of input.currencies) {
    const result = valueCurrency(currency, input.chart, input.at, input.presentationCurrency)
    if (!result.ok) return result
    valued.push(result.value)
  }

  const sum = (pick: (value: Valued) => Decimal): Decimal =>
    valued.reduce((acc, value) => acc.plus(pick(value)), ZERO)

  const assets = sum((value) => value.assets)
  const liabilities = sum((value) => value.liabilities)
  const equity = sum((value) => value.equityHistorical)
  const netWorth = assets.minus(liabilities)

  const money = (value: Decimal): Money => Money.fromDecimal(value, input.presentationCurrency)

  return ok({
    at: input.at,
    currency: input.presentationCurrency,
    assets: money(assets),
    liabilities: money(liabilities),
    equity: money(equity),
    netWorth: money(netWorth),
    exchangeDifference: money(netWorth.minus(equity)),
    balances: valued.every((value) => value.balances),
    byCurrency: valued.map((value) => value.breakdown),
  })
}
