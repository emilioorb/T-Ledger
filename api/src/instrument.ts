import * as Sentry from '@sentry/node'
import { loadEnv } from './shared/config/env.js'
import { scrub } from './shared/observability/scrub.js'

const env = loadEnv(process.env)

// Sin DSN no se inicializa nada. `Sentry.init` sin dsn deja el SDK andando en vacío, y es
// preferible que en desarrollo no exista a que exista sin hacer nada.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    // En cero a propósito. Los spans de Prisma llevan las consultas con sus parámetros, o sea
    // los montos. El tracing se prende cuando haya una razón concreta y alguien revise qué se
    // lleva cada span, no por venir activado en la guía de instalación.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrub,
  })
}
