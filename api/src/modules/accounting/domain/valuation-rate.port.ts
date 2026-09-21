import type { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'

// La clave del mapa es la fecha en AAAA-MM-DD, que es la granularidad a la que se publica
// una tasa: un Date como clave compararía por identidad y nunca acertaría.
export const rateKey = (date: Date): string => date.toISOString().slice(0, 10)

export interface ValuationRateSource {
  // Cuántas unidades de la moneda funcional vale una unidad de `currency` en cada fecha
  // pedida. Una fecha sin tasa vigente no aparece en el mapa: no hay valor por omisión, y
  // el reporte que la necesitaba tiene que decir que no puede valuar.
  //
  // Contabilidad no sabe de indicadores del BCCR ni de días sin publicación: pide fechas y
  // recibe números. De dónde salen es problema de infraestructura.
  ratesFor(dates: readonly Date[], currency: CurrencyCode): Promise<Map<string, Decimal>>
}

export const VALUATION_RATE_SOURCE = Symbol('VALUATION_RATE_SOURCE')
