import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { isErr } from '../../../shared/kernel/result.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { Account } from '../domain/account.js'
import { CHART_SEED } from '../infrastructure/chart-seed.js'

@Injectable()
export class SeedChartUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedChartUseCase.name)

  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.execute()
  }

  // Solo con la tabla vacía. Si Emilio borró una cuenta semilla es porque no la quiere,
  // y volver a meterla en el siguiente arranque sería el sistema discutiéndole.
  async execute(): Promise<number> {
    const chart = await this.accounts.loadChart()
    if (chart.all().length > 0) return 0

    const accounts: Account[] = []
    for (const props of CHART_SEED) {
      const account = Account.create(props)
      if (isErr(account)) throw account.error
      accounts.push(account.value)
    }

    await this.accounts.saveMany(accounts)
    this.logger.log(`Plan de cuentas sembrado con ${accounts.length} cuentas`)
    return accounts.length
  }
}
