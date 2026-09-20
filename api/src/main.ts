import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { loadEnv } from './shared/config/env.js'
import { AllExceptionsFilter } from './shared/http/all-exceptions.filter.js'

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(process.env)
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/v1')
  app.enableCors({ origin: env.CORS_ORIGIN })
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.listen(env.PORT)
}

void bootstrap()
