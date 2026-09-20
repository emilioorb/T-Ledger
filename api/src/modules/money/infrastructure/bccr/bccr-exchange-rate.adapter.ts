import { Injectable } from '@nestjs/common'
import type { DateRange } from '../../../../shared/kernel/date-range.js'
import type { ExchangeRateProviderPort } from '../../domain/exchange-rate-provider.port.js'
import { RATE_INDICATORS, type ExchangeRate } from '../../domain/exchange-rate.js'
import { BccrApiClient } from './bccr-api.client.js'
import { parseBccrResponse } from './bccr-response.schema.js'

@Injectable()
export class BccrExchangeRateAdapter implements ExchangeRateProviderPort {
  constructor(private readonly client: BccrApiClient) {}

  // Compra y venta son dos llamadas: la API expone un indicador por consulta.
  async fetchRates(range: DateRange): Promise<ExchangeRate[]> {
    const indicators = [RATE_INDICATORS.BUY, RATE_INDICATORS.SELL] as const
    const porIndicador = await Promise.all(
      indicators.map(async (indicator) => {
        const payload = await this.client.fetchSeries(indicator, range)
        return parseBccrResponse(payload, indicator)
      }),
    )
    return porIndicador.flat()
  }
}
