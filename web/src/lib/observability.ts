import * as Sentry from '@sentry/react'
import type { ErrorEvent, EventHint } from '@sentry/react'
import { ApiError } from './api'

// Copia deliberada del filtro del backend (`api/src/shared/observability/scrub.ts`). Son unas
// pocas líneas, los dos paquetes no comparten build, y montar un workspace para compartirlas
// costaría más que la duplicación. Si aparece un tercer consumidor, se extrae.
//
// Acá el riesgo es distinto y peor: en el navegador las migas guardan lo que la persona
// escribió campo por campo, así que `data` se va entera.
export const scrub = (event: ErrorEvent): ErrorEvent => {
  const limpio: ErrorEvent = { ...event }

  delete limpio.extra
  if (limpio.request) {
    const { url, method } = limpio.request
    limpio.request = {
      // La query puede llevar fechas, montos o lo que se buscó, y el fragmento el token de una
      // invitación.
      ...(url !== undefined && { url: url.split(/[?#]/)[0] }),
      ...(method !== undefined && { method }),
    }
  }
  if (limpio.user) {
    const { id } = limpio.user
    limpio.user = { ...(id !== undefined && { id }) }
  }
  if (limpio.breadcrumbs) {
    limpio.breadcrumbs = limpio.breadcrumbs.map((miga) => {
      const copia = { ...miga }
      delete copia.data
      return copia
    })
  }

  return limpio
}

// El texto de un error de la API lo escribe el servidor y puede repetir lo que la persona
// cargó («El nombre … ya existe»). El código y el estado alcanzan para saber qué pasó.
export const sinTextoDelServidor = (event: ErrorEvent, hint: EventHint): ErrorEvent => {
  const error = hint.originalException
  if (!(error instanceof ApiError) || !event.exception?.values) return event
  return {
    ...event,
    exception: {
      ...event.exception,
      values: event.exception.values.map((valor) => ({
        ...valor,
        value: `${error.code} (${error.status})`,
      })),
    },
  }
}

export const iniciarObservabilidad = (): void => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Solo lo que captura errores. Afuera las migas, que guardan clics, consola y navegación,
    // y Session Replay: aunque enmascare los montos, muestra qué hizo la persona, que en una app
    // de finanzas ya dice demasiado. Un arreglo en `integrations` se suma a las de por defecto,
    // no las reemplaza: por eso `defaultIntegrations: false`.
    defaultIntegrations: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.browserApiErrorsIntegration(),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.httpContextIntegration(),
    ],
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: (event, hint) => scrub(sinTextoDelServidor(event, hint)),
  })
}

// Después de iniciar sesión. Solo el id: alcanza para saber si un error le pasó a una persona
// o a doscientas, y quién es se resuelve contra la base.
export const identificar = (id: string): void => {
  Sentry.setUser({ id })
}

// Para los errores que atrapa una pantalla de error: al quedar atrapados, los manejadores
// globales de Sentry no los ven.
export const reportar = (error: unknown): void => {
  Sentry.captureException(error)
}

export const olvidarQuienEra = (): void => {
  Sentry.setUser(null)
}
