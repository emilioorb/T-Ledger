import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { CURRENCIES, type CurrencyCode } from '../../../shared/kernel/currency.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { buildNetWorth, type CurrencyInput, type NetWorth } from '../domain/reports/net-worth.js'
import {
  rateKey,
  VALUATION_RATE_SOURCE,
  type ValuationRateSource,
} from '../domain/valuation-rate.port.js'

@Injectable()
export class GetNetWorthUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(VALUATION_RATE_SOURCE) private readonly rates: ValuationRateSource,
  ) {}

  // Es el único reporte que no recibe moneda: consolidar es justamente no elegir una. La
  // moneda de presentación es la funcional, y viaja en la respuesta para que el número no
  // quede sin decir en qué está.
  async execute(at: Date, presentationCurrency: CurrencyCode): Promise<NetWorth> {
    const chart = await this.accounts.loadChart()

    const currencies = await Promise.all(
      CURRENCIES.map(async (currency): Promise<CurrencyInput> => {
        const [closing, daily] = await Promise.all([
          this.journal.totalsUpTo(currency, at),
          this.journal.totalsByAccountPerDay(currency, at),
        ])

        const rates = await this.rates.ratesFor([at, ...daily.map((total) => total.date)], currency)

        return {
          currency,
          closing,
          daily,
          closingRate: rates.get(rateKey(at)) ?? null,
          dailyRates: rates,
        }
      }),
    )

    // Una moneda sin un solo asiento no necesita tasa: pedirla sería exigir una publicación
    // para valuar cero.
    const withMovement = currencies.filter(
      (currency) => currency.closing.length > 0 || currency.daily.length > 0,
    )

    const result = buildNetWorth({ at, presentationCurrency, chart, currencies: withMovement })
    if (isErr(result)) throw new SemanticValidationError(result.error.message)
    return result.value
  }
}
