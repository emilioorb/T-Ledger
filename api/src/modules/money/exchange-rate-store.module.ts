import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { EXCHANGE_RATE_REPOSITORY } from './domain/exchange-rate-repository.port.js'
import { PrismaExchangeRateRepository } from './infrastructure/prisma-exchange-rate.repository.js'

// Las tasas guardadas se leen desde dos lados: el módulo de dinero, que además las sincroniza
// contra el BCCR, y contabilidad, que solo las consulta para valuar. Separarlas en su propio
// módulo es lo que evita que consultar una tasa exija credenciales del BCCR.
@Module({
  imports: [PrismaModule],
  providers: [{ provide: EXCHANGE_RATE_REPOSITORY, useClass: PrismaExchangeRateRepository }],
  exports: [EXCHANGE_RATE_REPOSITORY],
})
export class ExchangeRateStoreModule {}
