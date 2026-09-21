import { Controller, Get, Query } from '@nestjs/common'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { isErr } from '../../../shared/kernel/result.js'
import { GetLatestRatesUseCase } from '../application/get-latest-rates.use-case.js'
import { ListRatesUseCase } from '../application/list-rates.use-case.js'
import { toExchangeRateResponse } from './exchange-rate.presenter.js'
import {
  listRatesQuerySchema,
  type ExchangeRateResponse,
  type LatestRates,
  type ListRatesQuery,
} from './exchange-rate.schemas.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly listRates: ListRatesUseCase,
    private readonly getLatest: GetLatestRatesUseCase,
  ) {}

  // Declarado antes de cualquier ruta con parámetro: si no, 'latest' se toma por un id.
  @Get('latest')
  async latest(): Promise<LatestRates> {
    const result = await this.getLatest.execute()
    return {
      buy: result.buy ? toExchangeRateResponse(result.buy) : null,
      sell: result.sell ? toExchangeRateResponse(result.sell) : null,
      stale: result.stale,
      checkedAt: result.checkedAt.toISOString(),
    }
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listRatesQuerySchema)) query: ListRatesQuery,
  ): Promise<ExchangeRateResponse[]> {
    const range = DateRange.create(utc(query.from), utc(query.to))
    if (isErr(range)) throw new SemanticValidationError(range.error.message)

    const rates = await this.listRates.execute(query.indicator, range.value)
    return rates.map(toExchangeRateResponse)
  }
}
