# Fase 6a · Observabilidad — Plan de implementación

> **Para quien ejecute:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos
> usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** que los errores de Tape Ledger lleguen a Sentry sin que viaje un solo dato del
libro.

**Arquitectura:** el filtrado vive en una función pura y probada, `scrub`, que se pasa como
`beforeSend` tanto en el backend como en el front. El filtro **deniega por defecto**: borra
el cuerpo entero de la petición y solo deja pasar lo que una lista blanca corta permite. El
arranque del backend es ESM, así que Sentry se carga con `--import` y no con un import al tope
de `main.ts`.

**Stack:** `@sentry/node` y `@sentry/react`. Vitest 5 para los tests. NestJS 12 en ESM,
Vite 8 + React 19 en el front.

## Correcciones hechas al ejecutar

Cuatro cosas de este plan resultaron equivocadas al implementarlo. Quedan acá porque el plan
sin ellas induce al mismo error.

**1. `@sentry/node`, no `@sentry/nestjs`.** El segundo declara peer de `@nestjs/common` hasta
la versión 11 y este proyecto usa la 12: `npm install` falla con `ERESOLVE`. Forzarlo con
`--legacy-peer-deps` sería apostar a que Nest 12 no rompió nada de lo que ese paquete usa.
`@sentry/node` no declara peers de Nest e instala limpio.

**2. La captura va en `AllExceptionsFilter`, no en `SentryModule.forRoot()`.** Ese filtro ya
existe y ya decide qué es un error de servidor (`if (status >= 500)`). Enganchar ahí evita
tener dos criterios distintos de «esto es grave» y saca una dependencia. Resultó mejor que lo
planeado, no un remiendo.

**3. Sin `--import` y sin `cross-env`.** La guía de Sentry pide `--import` porque su
instrumentación automática engancha la carga de módulos y necesita hacerlo antes de que se
carguen. Con `tracesSampleRate: 0` no hay nada que instrumentar: lo único que se usa es
`captureException`, y para eso alcanza con que `Sentry.init` haya corrido, o sea un
`import './instrument.js'` como primer import de `main.ts`. Además `NODE_OPTIONS` con
`--import` rompe `nest start --watch`, porque el compilador hijo hereda la variable e intenta
cargar `dist/instrument.js` antes de que exista. **El día que se encienda el tracing, esto
vuelve a ser `--import`.**

**4. El paquete se instala antes del primer test, no después.** El test importa tipos de
`@sentry/node`, así que sin el paquete no corre ni para fallar bien.

**Spec:** `docs/superpowers/specs/2026-09-21-multiusuario-design.md`, sección 8.
**Decisión:** `docs/decisions/ADR-005-sentry-sin-datos-del-libro.md`.

## Restricciones globales

- El filtro deniega por defecto y permite explícitamente. Nunca una lista de campos prohibidos.
- Sin Session Replay.
- El usuario viaja como `{ id }` opaco. Nunca correo, nunca nombre.
- `tracesSampleRate: 0` al arrancar. Los spans de Prisma llevan las consultas con sus
  parámetros, así que el tracing se prende recién cuando haya una razón y una revisión.
- Todo lo que se escribe es TypeScript. Los `.js` de los comandos de arranque son el
  compilado, no fuente.
- Ambos paquetes son ESM (`"type": "module"`) con NodeNext: dentro de un `.ts`, los imports
  internos se escriben con extensión `.js` porque apuntan al build.
- Prettier con `--no-semi --single-quote --print-width 100`. Nunca correrlo sobre
  `web/src/components/ui/**`.
- Comentarios en español, explicando el porqué y no el qué.
- Si falta `SENTRY_DSN`, la app arranca igual y no reporta. No se cae por no tener telemetría.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `api/src/shared/observability/scrub.ts` | La función pura de filtrado. El corazón de todo. |
| `api/src/shared/observability/scrub.spec.ts` | Sus tests. |
| `api/src/instrument.ts` | `Sentry.init` del backend. Se carga con `--import`. |
| `api/src/shared/config/env.ts` | Suma `SENTRY_DSN` y `SENTRY_ENVIRONMENT`. |
| `api/src/app.module.ts` | Suma `SentryModule.forRoot()`. |
| `api/package.json` | Scripts `start` y `start:dev` con `--import`. |
| `web/src/lib/observability.ts` | `Sentry.init` del front, con el mismo criterio. |
| `web/src/main.tsx` | Lo llama antes de montar React. |

El `scrub` del front es una copia deliberada y no un paquete compartido: son diez líneas, los
dos paquetes no comparten build, y montar un workspace para esto costaría más que la
duplicación. Si algún día hay tres consumidores, se extrae.

---

### Tarea 1: El filtro

Es la única pieza con lógica y la que decide si la promesa se cumple. Va primero y va con
tests, porque un filtro que falla abierto en un sistema de privacidad es peor que no tener
filtro: da confianza falsa.

**Archivos:**
- Crear: `api/src/shared/observability/scrub.ts`
- Crear: `api/src/shared/observability/scrub.spec.ts`

**Interfaces:**
- Consume: nada.
- Produce: `scrub(event: ErrorEvent): ErrorEvent` — exportada, usada por `instrument.ts` en
  la tarea 2 y copiada en el front en la tarea 3.

- [ ] **Paso 1: escribir los tests que fallan**

`api/src/shared/observability/scrub.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/nestjs'
import { scrub } from './scrub.js'

const evento = (extra: Partial<ErrorEvent>): ErrorEvent =>
  ({ event_id: 'a', ...extra }) as ErrorEvent

describe('scrub', () => {
  it('borra el cuerpo de la petición, que es donde viajan los montos', () => {
    const limpio = scrub(
      evento({
        request: {
          url: 'https://api.tape/api/v1/movimientos',
          method: 'POST',
          data: { amount: '4500000', description: 'Pago de la casa' },
        },
      }),
    )

    expect(limpio.request?.data).toBeUndefined()
  })

  it('borra cookies, query y cabeceras salvo las de la lista blanca', () => {
    const limpio = scrub(
      evento({
        request: {
          url: 'https://api.tape/api/v1/movimientos?buscar=alquiler',
          cookies: { session: 'abc' },
          query_string: 'buscar=alquiler',
          headers: { 'content-type': 'application/json', authorization: 'Bearer x' },
        },
      }),
    )

    expect(limpio.request?.cookies).toBeUndefined()
    expect(limpio.request?.query_string).toBeUndefined()
    expect(limpio.request?.headers).toEqual({ 'content-type': 'application/json' })
  })

  it('deja el método y la url, que es lo que sirve para ubicar el error', () => {
    const limpio = scrub(
      evento({ request: { url: 'https://api.tape/api/v1/movimientos', method: 'POST' } }),
    )

    expect(limpio.request?.url).toBe('https://api.tape/api/v1/movimientos')
    expect(limpio.request?.method).toBe('POST')
  })

  it('del usuario deja solo el id', () => {
    const limpio = scrub(
      evento({ user: { id: 'c7f3', email: 'a@b.com', ip_address: '1.2.3.4', username: 'emi' } }),
    )

    expect(limpio.user).toEqual({ id: 'c7f3' })
  })

  it('sin usuario no inventa uno', () => {
    expect(scrub(evento({})).user).toBeUndefined()
  })

  it('borra extra y los datos de las migas, que arrastran cuerpos de petición', () => {
    const limpio = scrub(
      evento({
        extra: { movimiento: { amount: '4500000' } },
        breadcrumbs: [
          { category: 'http', message: 'POST /movimientos', data: { body: { amount: '1' } } },
        ],
      }),
    )

    expect(limpio.extra).toBeUndefined()
    expect(limpio.breadcrumbs?.[0].data).toBeUndefined()
    expect(limpio.breadcrumbs?.[0].message).toBe('POST /movimientos')
  })

  it('un campo nuevo en el cuerpo no necesita que nadie lo agregue a ninguna lista', () => {
    // Esta es la prueba de que el filtro deniega por defecto. Si algún día falla, es porque
    // alguien lo cambió a una lista de campos prohibidos y la promesa se rompió.
    const limpio = scrub(
      evento({
        request: { url: 'u', data: { campoQueNadieAnticipo: 'secreto' } },
      }),
    )

    expect(JSON.stringify(limpio)).not.toContain('secreto')
  })
})
```

- [ ] **Paso 2: correr los tests y ver que fallan**

```bash
cd api && npx vitest run src/shared/observability/scrub.spec.ts
```

Esperado: FALLA con `Failed to resolve import "./scrub.js"`.

- [ ] **Paso 3: escribir el filtro**

`api/src/shared/observability/scrub.ts`:

```ts
import type { ErrorEvent } from '@sentry/nestjs'

// Las únicas cabeceras que salen del servidor. La lista es corta a propósito: `authorization`
// lleva la sesión, `cookie` lo mismo, y `user-agent` más la IP identifica a una persona.
const CABECERAS_PERMITIDAS = ['content-type', 'content-length'] as const

// Sentry se lleva el cuerpo de las peticiones si uno lo deja. Un error en `POST /movimientos`
// viajaría con el monto, la descripción y la categoría hacia un tercero en otro país, que es
// justo lo que el producto promete no hacer.
//
// El filtro deniega por defecto: borra todo lo que pueda contener datos y devuelve solo lo
// que hace falta para ubicar el error. Una lista de campos prohibidos se rompería en silencio
// la primera vez que alguien agregue una columna y no se acuerde de sumarla.
export const scrub = (event: ErrorEvent): ErrorEvent => {
  const { request, user, breadcrumbs } = event

  return {
    ...event,
    extra: undefined,
    request: request && {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(
        Object.entries(request.headers ?? {}).filter(([nombre]) =>
          CABECERAS_PERMITIDAS.includes(nombre.toLowerCase() as (typeof CABECERAS_PERMITIDAS)[number]),
        ),
      ),
    },
    // El id alcanza para lo único que importa: si el error le pasó a una persona o a
    // doscientas. Quién es se resuelve contra la base, que es donde vive esa relación.
    user: user && { id: user.id },
    // Una miga de tipo http arrastra el cuerpo de la petición en `data`. El mensaje solo,
    // que es el verbo y la ruta, es lo que sirve para reconstruir el camino.
    breadcrumbs: breadcrumbs?.map(({ data, ...resto }) => resto),
  }
}
```

- [ ] **Paso 4: correr los tests y ver que pasan**

```bash
cd api && npx vitest run src/shared/observability/scrub.spec.ts
```

Esperado: 7 pasan.

- [ ] **Paso 5: instalar el SDK y verificar tipos y formato**

```bash
cd api && npm install @sentry/nestjs
npm run typecheck && npm run lint
npx prettier --no-semi --single-quote --print-width 100 --check src/shared/observability/
```

- [ ] **Paso 6: commit**

```bash
git add api/src/shared/observability api/package.json api/package-lock.json
git commit -m "🔒 feat: filtro que impide que un dato del libro llegue a Sentry"
```

---

### Tarea 2: Arranque del backend

**Archivos:**
- Crear: `api/src/instrument.ts`
- Modificar: `api/src/shared/config/env.ts`
- Modificar: `api/src/app.module.ts`
- Modificar: `api/package.json` (scripts `start` y `start:dev`)
- Crear: `api/src/shared/config/env.spec.ts`

**Interfaces:**
- Consume: `scrub` de la tarea 1.
- Produce: `Env` con `SENTRY_DSN?: string` y `SENTRY_ENVIRONMENT: string`.

- [ ] **Paso 1: escribir el test del env que falla**

`api/src/shared/config/env.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

const base = { DATABASE_URL: 'postgresql://x' }

describe('loadEnv con Sentry', () => {
  it('arranca sin DSN: no tener telemetría no puede tumbar la app', () => {
    expect(loadEnv(base).SENTRY_DSN).toBeUndefined()
  })

  it('toma el DSN cuando está', () => {
    expect(loadEnv({ ...base, SENTRY_DSN: 'https://k@o.ingest.sentry.io/1' }).SENTRY_DSN).toBe(
      'https://k@o.ingest.sentry.io/1',
    )
  })

  it('el ambiente por defecto es development, para no ensuciar producción desde una laptop', () => {
    expect(loadEnv(base).SENTRY_ENVIRONMENT).toBe('development')
  })
})
```

- [ ] **Paso 2: correr y ver que falla**

```bash
cd api && npx vitest run src/shared/config/env.spec.ts
```

Esperado: FALLA, `SENTRY_ENVIRONMENT` es `undefined`.

- [ ] **Paso 3: agregar las dos variables**

En `api/src/shared/config/env.ts`, dentro de `envSchema`:

```ts
  // Opcional a propósito: sin DSN la app arranca y no reporta. Quedarse sin servicio porque
  // falta la telemetría sería cambiar un problema chico por uno grande.
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
```

- [ ] **Paso 4: correr y ver que pasa**

```bash
cd api && npx vitest run src/shared/config/env.spec.ts
```

Esperado: 3 pasan.

- [ ] **Paso 5: escribir el arranque de Sentry**

`api/src/instrument.ts`:

```ts
import * as Sentry from '@sentry/nestjs'
import { loadEnv } from './shared/config/env.js'
import { scrub } from './shared/observability/scrub.js'

const env = loadEnv(process.env)

// Sin DSN no se inicializa nada: `Sentry.init` sin dsn deja el SDK andando en vacío, y es
// preferible que en desarrollo no exista a que exista sin hacer nada.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    // En cero a propósito. Los spans de Prisma llevan las consultas con sus parámetros, o sea
    // los montos. El tracing se prende cuando haya una razón concreta y alguien revise qué
    // se lleva cada span, no por venir activado en la guía de instalación.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrub,
  })
}
```

- [ ] **Paso 6: registrar el módulo y cargar el instrumento con `--import`**

En `api/src/app.module.ts`, agregar el import y sumarlo primero en `imports`:

```ts
import { SentryModule } from '@sentry/nestjs/setup'
```

```ts
@Module({ imports: [SentryModule.forRoot(), ScheduleModule.forRoot(), /* …el resto igual */] })
```

En `api/package.json`:

```json
"start": "node --import ./dist/instrument.js dist/main.js",
"start:dev": "cross-env NODE_OPTIONS=\"--import ./dist/instrument.js\" nest start --watch"
```

```bash
cd api && npm install --save-dev cross-env
```

**Por qué `--import` y no `import './instrument.js'` al tope de `main.ts`:** este paquete es
ESM (`"type": "module"`). En ESM todos los imports estáticos de un módulo se resuelven antes
de que corra su primera línea, así que un import al tope **no** garantiza que Sentry se
inicialice antes que `@nestjs/core` y Prisma. Sentry necesita cargarse primero de verdad para
poder instrumentarlos. La guía de Sentry lo dice explícito para ESM.

- [ ] **Paso 7: verificar que arranca con y sin DSN**

```bash
cd api && npm run build
node --import ./dist/instrument.js dist/main.js
```

Esperado: arranca normal, sin errores, y responde `GET /api/v1/openapi.json`.

```bash
SENTRY_DSN=https://k@o.ingest.sentry.io/1 node --import ./dist/instrument.js dist/main.js
```

Esperado: arranca igual. El DSN es falso, así que los envíos fallan en silencio, que es el
comportamiento correcto.

- [ ] **Paso 8: la suite completa y commit**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

```bash
git add api/src/instrument.ts api/src/app.module.ts api/src/shared/config api/package.json api/package-lock.json
git commit -m "✨ feat: el backend reporta a Sentry, cargado antes que todo lo demás"
```

---

### Tarea 3: El front

**Archivos:**
- Crear: `web/src/lib/observability.ts`
- Crear: `web/src/lib/observability.spec.ts`
- Modificar: `web/src/main.tsx`

**Interfaces:**
- Consume: nada de las tareas anteriores. El `scrub` se replica acá.
- Produce: `iniciarObservabilidad(): void`, llamada desde `main.tsx`.

- [ ] **Paso 1: escribir el test que falla**

`web/src/lib/observability.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { scrub } from './observability'

describe('scrub del front', () => {
  it('borra el cuerpo y deja url y método', () => {
    const limpio = scrub({
      event_id: 'a',
      request: { url: '/movimientos', method: 'POST', data: { amount: '4500000' } },
    })

    expect(limpio.request?.data).toBeUndefined()
    expect(limpio.request?.url).toBe('/movimientos')
  })

  it('del usuario deja solo el id', () => {
    const limpio = scrub({ event_id: 'a', user: { id: 'c7f3', email: 'a@b.com' } })

    expect(limpio.user).toEqual({ id: 'c7f3' })
  })

  it('borra los datos de las migas, que en el navegador guardan lo que se escribió', () => {
    const limpio = scrub({
      event_id: 'a',
      breadcrumbs: [{ category: 'ui.input', message: 'monto', data: { value: '4500000' } }],
    })

    expect(limpio.breadcrumbs?.[0].data).toBeUndefined()
  })
})
```

- [ ] **Paso 2: correr y ver que falla**

```bash
cd web && npx vitest run src/lib/observability.spec.ts
```

Esperado: FALLA con `Failed to resolve import "./observability"`.

- [ ] **Paso 3: escribirlo**

```bash
cd web && npm install @sentry/react
```

`web/src/lib/observability.ts`:

```ts
import * as Sentry from '@sentry/react'
import type { ErrorEvent } from '@sentry/react'

// Copia deliberada del filtro del backend (`api/src/shared/observability/scrub.ts`). Son diez
// líneas, los dos paquetes no comparten build, y montar un workspace para compartirlas
// costaría más que la duplicación. Si aparece un tercer consumidor, se extrae.
//
// Acá el riesgo es distinto y peor: en el navegador las migas guardan lo que la persona
// escribió campo por campo, así que `data` se va entera.
export const scrub = (event: ErrorEvent): ErrorEvent => {
  const { request, user, breadcrumbs } = event

  return {
    ...event,
    extra: undefined,
    request: request && { url: request.url, method: request.method },
    user: user && { id: user.id },
    breadcrumbs: breadcrumbs?.map(({ data, ...resto }) => resto),
  }
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
```

- [ ] **Paso 4: correr y ver que pasa**

```bash
cd web && npx vitest run src/lib/observability.spec.ts
```

Esperado: 3 pasan.

- [ ] **Paso 5: llamarlo antes de montar React**

En `web/src/main.tsx`, como primera línea ejecutable del archivo, antes de
`createRoot(...).render(...)`:

```ts
import { iniciarObservabilidad } from '@/lib/observability'

iniciarObservabilidad()
```

Va antes del render para que un error durante el primer montaje también se reporte, que es
justo cuando más se rompe.

- [ ] **Paso 6: verificar y commitear**

```bash
cd web && npm test && npm run typecheck && npm run build
npx prettier --no-semi --single-quote --print-width 100 --check src/lib/observability.ts
```

```bash
git add web/src/lib/observability.ts web/src/lib/observability.spec.ts web/src/main.tsx web/package.json web/package-lock.json
git commit -m "✨ feat: el front reporta a Sentry, sin replay y sin datos escritos"
```

---

### Tarea 4: Los proyectos y la prueba de punta a punta

Esta tarea toca una cuenta real, así que **no se ejecuta sin confirmación explícita de
Emilio**.

**Archivos:**
- Modificar: `.env.example` (o crearlo si no existe)

- [ ] **Paso 1: crear los dos proyectos en Sentry**

En la organización `arclo-systems`, siguiendo la convención de los que ya están
(`kodi`, `kodi-admin`, `kodi-backend`):

- `tape-ledger` — plataforma React
- `tape-ledger-backend` — plataforma Node / NestJS

- [ ] **Paso 2: poner los DSN**

En `api/.env`: `SENTRY_DSN=…` y `SENTRY_ENVIRONMENT=development`
En `web/.env`: `VITE_SENTRY_DSN=…`

Y en `.env.example`, las tres claves con el valor vacío y un comentario de una línea diciendo
que sin ellas la app corre igual y no reporta.

- [ ] **Paso 3: provocar un error de verdad en el backend y verificar qué llegó**

Pegarle a un endpoint con un id inexistente hasta obtener un 500 real, o agregar
temporalmente una ruta que tire. Después, **abrir el evento en Sentry y revisar campo por
campo** que no haya ni un monto, ni una descripción, ni un correo, ni una cookie.

Esa revisión manual es el punto de toda la tarea. Los tests prueban que la función filtra;
esto prueba que la función está conectada donde tiene que estar.

- [ ] **Paso 4: lo mismo en el front**

Provocar un error en una pantalla con datos cargados, para que las migas tengan qué arrastrar,
y revisar el evento igual.

- [ ] **Paso 5: commit**

```bash
git add .env.example
git commit -m "📝 docs: las variables de Sentry, opcionales a propósito"
```

---

## Autorrevisión

**Cobertura del spec, sección 8:** los dos proyectos con la convención existente están en la
tarea 4; el `beforeSend` que deniega por defecto, en la 1; sin Session Replay, en la 3
(`integrations: []`); `sendDefaultPii` apagado, en las tareas 2 y 3; el usuario como `{ id }`
opaco, probado en las tareas 1 y 3; el DSN por `loadEnv`, en la tarea 2.

**Un agregado que el spec no pedía:** `tracesSampleRate: 0`. Apareció al escribir el plan,
porque los spans de Prisma llevan las consultas con sus parámetros y eso son los montos. El
spec no lo contemplaba y habría sido una fuga por la puerta de al lado.

**Consistencia de nombres:** `scrub` se llama igual en los dos paquetes y en las tres tareas
que lo usan. `iniciarObservabilidad` solo existe en el front y solo la llama `main.tsx`.

**Lo que este plan no cubre:** identificar al usuario con `Sentry.setUser({ id })` después del
login. No se puede hacer todavía porque no hay login. Va en el plan de la fundación, que es
donde aparece la sesión.
