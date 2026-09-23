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
import { AppModule } from './app.module.js'
import { openApiDocument } from './shared/http/openapi.document.js'
import { loadEnv } from './shared/config/env.js'
import { AllExceptionsFilter } from './shared/http/all-exceptions.filter.js'
import { soloPorElProxy } from './shared/http/solo-por-el-proxy.js'

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(process.env)
  // `bodyParser: false` lo exige la integración de Better Auth, que necesita el cuerpo crudo
  // para sus propias rutas y repone los parsers para todas las demás. Verificado: los pipes de
  // Zod siguen viendo el cuerpo (ver ADR-001).
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  // Antes que todo lo demás: lo que no pasó por Vercel no llega ni a Better Auth.
  app.use(soloPorElProxy(env.PROXY_SECRET))
  app.setGlobalPrefix('api/v1')
  // `credentials: true` porque la sesión viaja en una cookie: sin esto el navegador la
  // descarta en cuanto el front está en otro origen, y el síntoma es una sesión que se pierde
  // en cada recarga sin que nada diga por qué.
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true })
  app.useGlobalFilters(new AllExceptionsFilter())

  app.getHttpAdapter().get('/api/v1/openapi.json', (_req, res) => res.json(openApiDocument))

  await app.listen(env.PORT)
}

void bootstrap()
