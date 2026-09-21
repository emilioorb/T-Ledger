import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { GetLatestRatesUseCase } from './application/get-latest-rates.use-case.js'
import { ListRatesUseCase } from './application/list-rates.use-case.js'
import { SyncExchangeRatesUseCase } from './application/sync-exchange-rates.use-case.js'
import { EXCHANGE_RATE_PROVIDER } from './domain/exchange-rate-provider.port.js'
import { EXCHANGE_RATE_REPOSITORY } from './domain/exchange-rate-repository.port.js'
import { BccrApiClient } from './infrastructure/bccr/bccr-api.client.js'
import { BccrExchangeRateAdapter } from './infrastructure/bccr/bccr-exchange-rate.adapter.js'
import { loadBccrConfig } from './infrastructure/bccr/bccr.config.js'
import { ExchangeRatesSyncJob } from './infrastructure/exchange-rates-sync.job.js'
import { ExchangeRatesController } from './infrastructure/exchange-rates.controller.js'
import { PrismaExchangeRateRepository } from './infrastructure/prisma-exchange-rate.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [ExchangeRatesController],
  providers: [
    // El cliente es un detalle del adaptador, no un nodo del grafo de dependencias:
    // así, quien sustituya el puerto no necesita saber que existe ni tener credenciales.
    {
      provide: EXCHANGE_RATE_PROVIDER,
      useFactory: () => new BccrExchangeRateAdapter(new BccrApiClient(loadBccrConfig(process.env))),
    },
    { provide: EXCHANGE_RATE_REPOSITORY, useClass: PrismaExchangeRateRepository },
    SyncExchangeRatesUseCase,
    GetLatestRatesUseCase,
    ListRatesUseCase,
    ExchangeRatesSyncJob,
  ],
  exports: [EXCHANGE_RATE_REPOSITORY],
})
export class MoneyModule {}
