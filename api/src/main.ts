// Primero de todo: `instrument` llama a `Sentry.init`, y una captura anterior a esa llamada
// se pierde en silencio. En ESM los módulos se evalúan en el orden en que están importados,
// así que estar arriba alcanza.
//
// La guía de Sentry pide arrancar Node con `--import` en vez de esto, porque su
// instrumentación automática engancha la carga de módulos y necesita hacerlo antes de que
// se carguen. Acá no aplica: con `tracesSampleRate: 0` no hay spans que instrumentar, y lo
// único que se usa es `captureException` desde el filtro de excepciones. El día que se
// encienda el tracing, esto vuelve a ser `--import` y hay que acordarse.
import './instrument.js'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { createDocument } from 'zod-openapi'
import { AppModule } from './app.module.js'
import { accountingOpenApiPaths } from './modules/accounting/infrastructure/accounting.openapi.js'
import { budgetOpenApiPaths } from './modules/budget/infrastructure/budget.openapi.js'
import { goalsOpenApiPaths } from './modules/goals/infrastructure/goals.openapi.js'
import { investmentsOpenApiPaths } from './modules/investments/infrastructure/investments.openapi.js'
import { projectionOpenApiPaths } from './modules/projection/infrastructure/projection.openapi.js'
import { bankingOpenApiPaths } from './modules/banking/infrastructure/banking.openapi.js'
import { debtsOpenApiPaths } from './modules/debts/infrastructure/debts.openapi.js'
import { exchangeRatesOpenApiPaths } from './modules/money/infrastructure/exchange-rates.openapi.js'
import { loadEnv } from './shared/config/env.js'
import { AllExceptionsFilter } from './shared/http/all-exceptions.filter.js'

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(process.env)
  // `bodyParser: false` lo exige la integración de Better Auth, que necesita el cuerpo crudo
  // para sus propias rutas y repone los parsers para todas las demás. Verificado: los pipes de
  // Zod siguen viendo el cuerpo (ver ADR-001).
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  app.setGlobalPrefix('api/v1')
  app.enableCors({ origin: env.CORS_ORIGIN })
  app.useGlobalFilters(new AllExceptionsFilter())

  const openapi = createDocument({
    openapi: '3.1.0',
    info: { title: 'Finanzas API', version: '1.0.0' },
    servers: [{ url: '/api/v1' }],
    paths: { ...debtsOpenApiPaths, ...exchangeRatesOpenApiPaths, ...accountingOpenApiPaths, ...budgetOpenApiPaths, ...goalsOpenApiPaths, ...investmentsOpenApiPaths, ...projectionOpenApiPaths, ...bankingOpenApiPaths },
  })
  app.getHttpAdapter().get('/api/v1/openapi.json', (_req, res) => res.json(openapi))

  await app.listen(env.PORT)
}

void bootstrap()
