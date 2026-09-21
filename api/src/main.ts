import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { createDocument } from 'zod-openapi'
import { AppModule } from './app.module.js'
import { accountingOpenApiPaths } from './modules/accounting/infrastructure/accounting.openapi.js'
import { debtsOpenApiPaths } from './modules/debts/infrastructure/debts.openapi.js'
import { exchangeRatesOpenApiPaths } from './modules/money/infrastructure/exchange-rates.openapi.js'
import { loadEnv } from './shared/config/env.js'
import { AllExceptionsFilter } from './shared/http/all-exceptions.filter.js'

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(process.env)
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/v1')
  app.enableCors({ origin: env.CORS_ORIGIN })
  app.useGlobalFilters(new AllExceptionsFilter())

  const openapi = createDocument({
    openapi: '3.1.0',
    info: { title: 'Finanzas API', version: '1.0.0' },
    servers: [{ url: '/api/v1' }],
    paths: { ...debtsOpenApiPaths, ...exchangeRatesOpenApiPaths, ...accountingOpenApiPaths },
  })
  app.getHttpAdapter().get('/api/v1/openapi.json', (_req, res) => res.json(openapi))

  await app.listen(env.PORT)
}

void bootstrap()
