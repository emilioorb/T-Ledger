import { Inject, Injectable } from '@nestjs/common'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepository,
} from '../domain/exchange-rate-repository.port.js'
import type { ExchangeRate, RateIndicator } from '../domain/exchange-rate.js'

@Injectable()
export class ListRatesUseCase {
  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY) private readonly repository: ExchangeRateRepository,
  ) {}

  async execute(indicator: RateIndicator, range: DateRange): Promise<ExchangeRate[]> {
    return this.repository.findInRange(indicator, range)
  }
}
