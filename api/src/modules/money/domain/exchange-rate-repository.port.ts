import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { ExchangeRate, RateIndicator } from './exchange-rate.js'

export interface ExchangeRateRepository {
  // «Vigente en la fecha X» es la última publicación con fecha menor o igual a X:
  // el BCCR no publica fines de semana ni feriados.
  findEffectiveAt(indicator: RateIndicator, date: Date): Promise<ExchangeRate | null>

  // Todas las publicaciones hasta una fecha, de la más vieja a la más nueva. Existe para
  // que valuar cien días de asientos sea una consulta y no cien: el patrimonio pide la
  // tasa vigente de cada día con asientos, y con tres años de historia eso eran ~2.000.
  findPublishedUpTo(indicator: RateIndicator, at: Date): Promise<ExchangeRate[]>
  findLatest(indicator: RateIndicator): Promise<ExchangeRate | null>
  findInRange(indicator: RateIndicator, range: DateRange): Promise<ExchangeRate[]>
  saveMany(rates: readonly ExchangeRate[]): Promise<number>
}

export const EXCHANGE_RATE_REPOSITORY = Symbol('EXCHANGE_RATE_REPOSITORY')
