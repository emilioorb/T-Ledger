import * as Sentry from '@sentry/react'
import type { ErrorEvent } from '@sentry/react'

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
      ...(url !== undefined && { url }),
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

export const iniciarObservabilidad = (): void => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Sin Session Replay. Aunque enmascare los montos, un replay muestra la estructura de la
    // pantalla y qué hizo la persona, que en una app de finanzas ya dice demasiado.
    integrations: [],
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrub,
  })
}

// Después de iniciar sesión. Solo el id: alcanza para saber si un error le pasó a una persona
// o a doscientas, y quién es se resuelve contra la base.
export const identificar = (id: string): void => {
  Sentry.setUser({ id })
}

export const olvidarQuienEra = (): void => {
  Sentry.setUser(null)
}
