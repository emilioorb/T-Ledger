# Fase 1 · Rebanada 1 — Fundación y deudas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar el proyecto y la funcionalidad de deudas completa de punta a punta (Postgres → dominio → API → UI), de modo que Emilio pueda cargar una deuda, ver su tabla de amortización y simular un abono extraordinario.

**Architecture:** Dos proyectos independientes en un repositorio, `api/` y `web/`, cada uno con su `package.json`. La API es NestJS en modo estándar con arquitectura hexagonal: el dominio de `debts` es TypeScript puro, sin Nest ni Prisma, y la amortización es una función pura probada contra tablas calculadas a mano. La persistencia entra por un puerto con token de Nest y nunca devuelve tipos de Prisma hacia arriba. El contrato lo definen esquemas Zod en la API; el frontend no los importa, deriva sus tipos del OpenAPI generado.

**Tech Stack:** PostgreSQL 18 (Docker Compose) · NestJS 12 · Prisma 7 con driver adapter `@prisma/adapter-pg` · Zod 4 · Vite 8 + React 19 · TanStack Router + TanStack Query · Tailwind 4 + shadcn/ui · Vitest 5 · Testcontainers 12 · decimal.js 10.

**Spec:** `docs/superpowers/specs/2026-09-20-finanzas-personales-design.md`

**Planes hermanos (ejecutar en este orden):**

1. `2026-09-20-fase1-fundacion-y-deudas.md`
2. `2026-09-20-fase1-tipos-de-cambio.md` (BCCR)
3. `2026-09-20-fase1-contabilidad.md`
4. `2026-09-20-fase1-presupuesto-metas-inversiones-proyeccion.md`

---

## Global Constraints

Versiones verificadas contra el registro npm el 2026-09-20. **Pinear exacto**: nada de rangos `^`.

| Paquete | Versión | Nota |
|---|---|---|
| Node.js | `>=24` | declarado en `engines` |
| `typescript` | `6.0.3` | **No 7.0.2.** `@nestjs/cli@12.0.3` declara `typescript: ~6.0.2`. TS 7 es el port nativo y queda fuera de alcance |
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/testing`, `@nestjs/cli` | `12.0.3` | |
| `@nestjs/config` | `12.0.0` | |
| `@nestjs/swagger` | `12.0.1` | fuente del OpenAPI que consume el frontend |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | `7.10.0` | **Pinear.** El dist-tag `latest` de `prisma` apunta a `8.0.0-rc.15`; instalar sin versión traería un release candidate |
| `pg` | `8.23.0` | |
| `decimal.js` | `10.6.0` | |
| `zod` | `4.6.5` | API v4: el parámetro de error unificado es `error`, no `message` |
| `vite` | `8.3.0` | |
| `@vitejs/plugin-react` | `6.1.1` | |
| `react`, `react-dom` | `19.3.0` | |
| `@tanstack/react-router` | `1.170.38` | |
| `@tanstack/router-plugin` | `1.168.40` | |
| `@tanstack/react-query` | `5.103.1` | |
| `tailwindcss`, `@tailwindcss/vite` | `4.3.3` | |
| `recharts` | `3.10.1` | solo como dependencia del componente `chart` de shadcn |
| `sonner` | `2.0.8` | toasts de shadcn |
| `vitest` | `5.0.1` | |
| `@testcontainers/postgresql` | `12.1.0` | |
| `@types/node` | `26.6.2` | |
| `eslint` | `10.11.0` | mayor 10; `typescript-eslint@8.70` la soporta |
| `typescript-eslint` | `8.70.0` | acepta `eslint ^10` y `typescript <6.1.0` |
| `@eslint/js` | `10.0.1` | |

### Reglas de backend (aplican a toda tarea de API)

1. **Nunca `Float`** para dinero ni para tasas. Montos: `BigInt` en unidad mínima + código ISO 4217 en `String`. Tasas: `Decimal`.
2. **Nunca `any`.** Cuando el tipo es incierto, `unknown` con estrechamiento, o genéricos.
3. `api/src/modules/*/domain/` y `api/src/shared/kernel/` **no importan** `@nestjs/*`, Prisma ni nada de HTTP. Se verifica con una regla de ESLint en la Tarea 1.
4. Ningún módulo importa el `domain/` de otro módulo.
5. Los repositorios devuelven entidades de dominio, jamás tipos generados por Prisma.
6. Los puertos se inyectan con tokens `Symbol` de Nest: `{ provide: DEBT_REPOSITORY, useClass: PrismaDebtRepository }`.
7. La validación ocurre solo en los bordes: controladores HTTP, respuestas de servicios externos y carga de variables de entorno. Entre funciones internas se confía en los tipos.
8. Formato de error único en todos los endpoints: `{ "error": { "code", "message", "details"? } }`. Mapeo: 400 entrada inválida · 404 no encontrado · 409 conflicto · 422 validación semántica · 500 error interno sin detalles internos expuestos.
9. Toda lista pagina: `page`, `pageSize` de entrada; `pagination` en la respuesta.
10. Todo schema expuesto lleva `title` explícito, para que los tipos generados en el frontend salgan con nombre y no como objetos anónimos.
11. Todo archivo TypeScript se importa con extensión `.js` explícita (ambos proyectos son ESM).

### Reglas de frontend (aplican a toda tarea de UI)

No son negociables y valen para las tres rebanadas del plan.

| # | Regla |
|---|---|
| F1 | **Antes de escribir UI**, cargar y seguir las skills `frontend-design`, `impeccable`, `emil-design-eng`, `accessibility`, `color-contrast` y `mobile-responsiveness`, incluyendo sus `reference/`. Si aparece un caso que ninguna cubre, buscar la skill con `find-skills` e instalarla con `npx skills add <nombre> -a claude` |
| F2 | **shadcn/ui para todo.** Ningún componente de interfaz a mano si shadcn tiene uno. Incluye gráficos: se usa el componente `chart` de shadcn, que envuelve Recharts. Nunca un `LineChart` de Recharts directo |
| F3 | **Responsive perfecto.** Toda pantalla se verifica a 360, 768 y 1440 px. Ninguna tabla desborda en móvil: bajo 768 px la tabla de amortización se rinde como lista de tarjetas |
| F4 | **El copy lo decide una skill.** Texto nuevo con `copywriting`; revisión de texto existente con `copy-editing`. Ningún título, etiqueta, placeholder, estado vacío ni mensaje de error se escribe a criterio propio |
| F5 | **Errores 100 % cubiertos con toast de shadcn** (`sonner`). Toda mutación y toda query con error muestra un toast. Nada de errores silenciosos en consola, ni `alert()`, ni texto de error suelto sin toast |
| F6 | **Minimalismo completo.** Sin adornos, sombras decorativas ni gradientes de relleno. Jerarquía por espacio y tipografía, no por color |
| F7 | Todo estado de carga usa `Skeleton` de shadcn; todo estado vacío es un componente explícito con copy salido de `copywriting` |
| F8 | **Una pantalla no está hecha hasta que sus cinco estados están hechos**: cargando, vacía, con un solo elemento, con muchos elementos y con error. El camino feliz solo no cuenta como pantalla terminada |
| F9 | **Prohibido el layout por defecto**: barra lateral gris, encabezado, y una fila de cuatro tarjetas de métricas iguales arriba. Si el resultado se parece a la plantilla de administración de cualquier producto, se rehace. La composición se gana con jerarquía, ritmo de espaciado variado y asimetría deliberada, no repartiendo todo en una cuadrícula uniforme |
| F10 | **Ritmo de espaciado variado.** El mismo `padding` en todos lados es monotonía, no sistema. El espacio separa por importancia |
| F11 | **Puerta de calidad, no opcional.** Ninguna tarea de UI se cierra sin correr `impeccable critique` y `impeccable audit` sobre lo construido y resolver lo que salga. Si el resultado quedó tibio, `impeccable bolder`; si quedó ruidoso, `impeccable quieter`. El último paso siempre es `impeccable polish` |
| F12 | **Revisión visual con capturas.** Antes de dar por terminada una pantalla, capturarla con Playwright a 360, 768 y 1440 px **en los dos temas** —seis capturas— y mirarlas. Lo que no se ve, no se revisó |

### Convención de commits

Conventional Commits con gitmoji: `✨ feat:`, `🐛 fix:`, `♻️ refactor:`, `🧪 test:`, `🏗️ build:`, `📝 docs:`. Sin `Co-Authored-By`.

### Fuentes consultadas

- NestJS, modo estándar vs monorepo: https://github.com/nestjs/docs.nestjs.com/blob/master/content/cli/workspaces.md
- NestJS, tokens `Symbol` e `@Inject`: https://github.com/nestjs/docs.nestjs.com/blob/master/content/fundamentals/dependency-injection.md
- NestJS, `title` en schemas para tipos generados con nombre: https://docs.nestjs.com/openapi/operations
- Prisma 7, generador y adapter: https://github.com/prisma/skills/blob/main/prisma-upgrade-v7/SKILL.md
- Prisma 7, `output` obligatorio: https://github.com/prisma/skills/blob/main/prisma-upgrade-v7/references/schema-changes.md
- Prisma 7, `prisma.config.ts`: https://github.com/prisma/skills/blob/main/prisma-postgres-setup/SKILL.md
- Prisma, tipos nativos y `@db.Date`: https://www.prisma.io/docs/orm/v7/prisma-client/type-safety/prisma-type-system
- Prisma, mapeo a PostgreSQL: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql
- TanStack Router, orden del plugin de Vite: https://github.com/tanstack/router/blob/main/packages/router-plugin/skills/router-plugin/SKILL.md
- TanStack Router, contexto con `queryClient`: https://github.com/tanstack/router/blob/main/packages/react-router/skills/compositions/router-query/SKILL.md
- Tailwind 4 con Vite: https://tailwindcss.com/docs
- Zod 4, parámetro `error` unificado: https://zod.dev/v4/changelog
- Testcontainers, PostgreSQL: https://github.com/testcontainers/testcontainers-node/blob/main/docs/modules/postgresql.md

### Mapa de archivos

```
finanzas/
├── docker-compose.yml                   Postgres 18 local
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── eslint.config.js                 incluye la regla de frontera del dominio
│   ├── vitest.config.ts
│   ├── prisma.config.ts
│   ├── prisma/schema.prisma
│   └── src/
│       ├── shared/kernel/               result, currency, money, percentage, interest-rate, date-range
│       ├── shared/http/                 filtro de excepciones, esquemas de paginación
│       ├── shared/prisma/               PrismaService con el adapter de pg
│       ├── modules/debts/
│       │   ├── domain/                  debt, amortization, payoff-strategy, puerto del repositorio
│       │   ├── application/             casos de uso
│       │   └── infrastructure/          repositorio Prisma, controlador, esquemas Zod, módulo
│       ├── app.module.ts
│       └── main.ts
└── web/
    ├── package.json
    ├── vite.config.ts
    ├── components.json                  configuración de shadcn
    └── src/
        ├── routes/                      rutas por archivo de TanStack Router
        ├── lib/                         cliente HTTP, tipos generados, formateo de Money
        └── components/ui/               shadcn
```

Cada archivo tiene una responsabilidad. Si al implementar un archivo pasa de ~200 líneas, partirlo por responsabilidad, no por capa.

---

## Tareas

### Tarea 1: Proyecto de la API, tooling y Postgres local

**Descripción:** Dejar el repositorio ejecutable: proyecto `api/` con TypeScript, Vitest, ESLint con la regla de frontera del dominio, y un Postgres levantable con un comando. Sin esto ninguna otra tarea puede correr un test. El entregable se valida con el primer archivo del kernel, `Result`.

**Alcance:** M · **Dependencias:** ninguna

**Files:**
- Create: `.gitignore`, `docker-compose.yml`, `.env.example`
- Create: `api/package.json`, `api/tsconfig.json`, `api/eslint.config.js`, `api/vitest.config.ts`
- Create: `api/src/shared/kernel/result.ts`
- Test: `api/src/shared/kernel/result.spec.ts`

**Interfaces:**
- Produces: `Result<T, E>`, `Ok<T>`, `Err<E>`, `ok()`, `err()`, `isOk()`, `isErr()`, `unwrap()` desde `src/shared/kernel/result.js`. Todas las tareas siguientes los usan para errores de dominio esperables.

- [x] **Paso 1: Crear el esqueleto del repositorio**

```bash
cd finanzas
git init 2>/dev/null || true
mkdir -p api/src/shared/kernel
```

`.gitignore`:

```
node_modules/
dist/
.env
api/generated/
coverage/
*.tsbuildinfo
web/src/routeTree.gen.ts
```

- [x] **Paso 2: Postgres local y variables de entorno**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: finanzas
      POSTGRES_PASSWORD: finanzas
      POSTGRES_DB: finanzas
    ports:
      - "5433:5432"
    volumes:
      - finanzas-db:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U finanzas -d finanzas"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  finanzas-db:
```

El puerto del host es 5433 para no chocar con un Postgres ya instalado en la máquina.

`.env.example`:

```
DATABASE_URL="postgresql://finanzas:finanzas@localhost:5433/finanzas?schema=public"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

- [x] **Paso 3: Proyecto de la API**

`api/package.json`:

```json
{
  "name": "finanzas-api",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "build": "tsc -p tsconfig.json",
    "start:dev": "node --watch --experimental-strip-types src/main.ts"
  },
  "dependencies": {
    "decimal.js": "10.6.0"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "26.6.2",
    "eslint": "10.11.0",
    "typescript": "6.0.3",
    "typescript-eslint": "8.70.0",
    "vitest": "5.0.1"
  }
}
```

`api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

`emitDecoratorMetadata` es obligatorio: NestJS resuelve los tipos de los constructores en tiempo de ejecución a partir de esos metadatos. Es la razón por la que este proyecto se queda en TypeScript 6 y no salta a 7.

No se activa `verbatimModuleSyntax`: colisiona con `emitDecoratorMetadata`, porque los tipos importados como `import type` desaparecen del emitido y Nest deja de poder inyectarlos.

- [x] **Paso 4: ESLint con la regla de frontera del dominio**

`api/eslint.config.js`:

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'generated/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts', 'src/shared/kernel/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@nestjs/*'], message: 'El dominio no depende de Nest.' },
            { group: ['@prisma/*', '**/generated/prisma/**'], message: 'El dominio no depende de Prisma.' },
            { group: ['express', 'node:http'], message: 'El dominio no depende de HTTP.' },
            { group: ['**/modules/*/domain/**'], message: 'Ningún módulo importa el dominio de otro módulo.' },
          ],
        },
      ],
    },
  },
)
```

`api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
})
```

```bash
cd api && npm install
```

- [x] **Paso 5: Escribir el test que falla**

`api/src/shared/kernel/result.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok, unwrap } from './result.js'

describe('Result', () => {
  it('ok envuelve un valor y lo reconoce como éxito', () => {
    const result = ok(42)
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(42)
  })

  it('err envuelve un error y lo reconoce como fallo', () => {
    const result = err(new RangeError('fuera de rango'))
    expect(isErr(result)).toBe(true)
    expect(isOk(result)).toBe(false)
  })

  it('unwrap sobre un err lanza el error contenido', () => {
    expect(() => unwrap(err(new RangeError('fuera de rango')))).toThrow(RangeError)
  })
})
```

- [x] **Paso 6: Correr el test y confirmar que falla**

```bash
cd api && npm test
```

Esperado: FAIL con `Failed to resolve import "./result.js"`.

- [x] **Paso 7: Implementación mínima**

`api/src/shared/kernel/result.ts`:

```ts
export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E> {
  readonly ok: false
  readonly error: E
}

export type Result<T, E> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })

export const err = <E>(error: E): Err<E> => ({ ok: false, error })

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok

// Solo para tests y para puntos donde el fallo ya fue descartado: rompe el contrato del tipo.
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw result.error
  return result.value
}
```

- [x] **Paso 8: Correr todo y confirmar que pasa**

```bash
cd api && npm test && npm run typecheck && npm run lint
cd .. && docker compose up -d db && docker compose ps
```

Esperado: 3 tests pasando, `tsc` sin errores, ESLint limpio, el contenedor `db` en estado `healthy`.

- [x] **Paso 9: Verificar que la regla de frontera muerde**

Agregar temporalmente al inicio de `api/src/shared/kernel/result.ts`:

```ts
import { Injectable } from '@nestjs/common'
```

```bash
cd api && npm run lint
```

Esperado: FAIL con `El dominio no depende de Nest.` Borrar la línea y volver a correr el lint: limpio.

Este paso no es ceremonia. Una regla de arquitectura que no se prueba es una regla que no existe.

- [x] **Paso 10: Commit**

```bash
git add -A
git commit -m "🏗️ build: proyecto de la API, tooling, Postgres local y tipo Result"
```

**Acceptance criteria:**
- [x] `npm test`, `npm run lint` y `npm run typecheck` corren dentro de `api/` sin error
- [x] `docker compose up -d db` deja el contenedor en `healthy`
- [x] Un `import` de `@nestjs/common` dentro de `shared/kernel/` falla el lint, comprobado en el Paso 9

**Verification:**
- [x] `cd api && npm test` → 3 pasando
- [x] `docker compose ps` → `db` en `healthy`

---

### Tarea 2: `Money` — valor monetario exacto con reparto sin pérdida

**Descripción:** El tipo del que cuelga todo lo demás. Inmutable, guarda un `bigint` en la unidad mínima más el código ISO de la moneda. Toda operación entre monedas distintas falla explícitamente devolviendo `Result`, no lanzando. `allocate` reparte un monto entre razones distribuyendo el residuo, de modo que la suma de las partes siempre iguala el total — es la operación que evita que un 50/30/20 sobre ₡1.000.001 pierda un céntimo.

**Alcance:** S · **Dependencias:** Tarea 1

**Files:**
- Create: `api/src/shared/kernel/currency.ts`
- Create: `api/src/shared/kernel/money.ts`
- Test: `api/src/shared/kernel/money.spec.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `err` de `./result.js`
- Produces:
  - `type CurrencyCode = 'CRC' | 'USD'`, `MINOR_UNIT_EXPONENT: Record<CurrencyCode, number>`
  - `class CurrencyMismatchError extends Error` con `readonly code = 'CURRENCY_MISMATCH'`
  - `class Money` con: `static fromMinorUnits(minorUnits: bigint, currency: CurrencyCode): Money` · `static fromDecimal(value: Decimal.Value, currency: CurrencyCode): Money` · `static zero(currency: CurrencyCode): Money` · `add(other: Money): Result<Money, CurrencyMismatchError>` · `subtract(other: Money): Result<Money, CurrencyMismatchError>` · `multiply(factor: Decimal.Value): Money` · `allocate(ratios: readonly number[]): Money[]` · `compareTo(other: Money): Result<number, CurrencyMismatchError>` · `negate(): Money` · `isZero(): boolean` · `isNegative(): boolean` · `equals(other: Money): boolean` · `toDecimal(): Decimal` · `toJSON(): { minorUnits: string; currency: CurrencyCode }` · propiedades `minorUnits: bigint` y `currency: CurrencyCode`

- [x] **Paso 1: Escribir el test que falla**

`api/src/shared/kernel/money.spec.ts`:

```ts
import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { CurrencyMismatchError, Money } from './money.js'
import { isErr, unwrap } from './result.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')

describe('Money', () => {
  it('construye desde decimal redondeando a la unidad mínima', () => {
    expect(Money.fromDecimal('1234.567', 'CRC').minorUnits).toBe(123457n)
    expect(Money.fromDecimal('1234.564', 'CRC').minorUnits).toBe(123456n)
  })

  it('suma y resta montos de la misma moneda', () => {
    expect(unwrap(crc(1000n).add(crc(250n))).minorUnits).toBe(1250n)
    expect(unwrap(crc(1000n).subtract(crc(250n))).minorUnits).toBe(750n)
  })

  it('falla explícitamente al operar monedas distintas', () => {
    const result = crc(1000n).add(Money.fromMinorUnits(1000n, 'USD'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(CurrencyMismatchError)
      expect(result.error.code).toBe('CURRENCY_MISMATCH')
    }
  })

  it('multiplica con redondeo a la unidad mínima', () => {
    expect(crc(10_000n).multiply('0.075').minorUnits).toBe(750n)
    expect(crc(333n).multiply(new Decimal(1).div(3)).minorUnits).toBe(111n)
  })

  it('compara montos de la misma moneda', () => {
    expect(unwrap(crc(1000n).compareTo(crc(500n)))).toBe(1)
    expect(unwrap(crc(500n).compareTo(crc(1000n)))).toBe(-1)
    expect(unwrap(crc(500n).compareTo(crc(500n)))).toBe(0)
  })

  it('allocate cuadra exactamente en un reparto no divisible', () => {
    const parts = crc(5n).allocate([1, 1, 1])
    expect(parts.map((p) => p.minorUnits)).toEqual([2n, 2n, 1n])
    const total = parts.reduce((acc, p) => acc + p.minorUnits, 0n)
    expect(total).toBe(5n)
  })

  it('allocate reparte por porcentajes sin perder unidades', () => {
    const parts = crc(100_000_1n).allocate([50, 30, 20])
    const total = parts.reduce((acc, p) => acc + p.minorUnits, 0n)
    expect(total).toBe(100_000_1n)
  })

  it('allocate respeta el orden de las razones', () => {
    const parts = crc(5n).allocate([3, 7])
    expect(parts.map((p) => p.minorUnits)).toEqual([2n, 3n])
  })

  it('allocate conserva el signo de un monto negativo', () => {
    const parts = crc(-5n).allocate([1, 1, 1])
    expect(parts.map((p) => p.minorUnits)).toEqual([-2n, -2n, -1n])
  })

  it('allocate rechaza una lista vacía o razones que suman cero', () => {
    expect(() => crc(100n).allocate([])).toThrow(RangeError)
    expect(() => crc(100n).allocate([0, 0])).toThrow(RangeError)
  })

  it('se serializa sin perder precisión', () => {
    expect(crc(56_349_293_00n).toJSON()).toEqual({
      minorUnits: '5634929300',
      currency: 'CRC',
    })
  })
})
```

El caso `56_349_293_00n` no es decorativo: son ₡56.349.293 en céntimos, y desborda un `int32`. Es la razón por la que la persistencia usa `BigInt`.

- [x] **Paso 2: Correr el test y confirmar que falla**

```bash
cd api && npm test -- money
```

Esperado: FAIL con `Failed to resolve import "./money.js"`.

- [x] **Paso 3: Implementar la moneda**

`api/src/shared/kernel/currency.ts`:

```ts
export const CURRENCIES = ['CRC', 'USD'] as const

export type CurrencyCode = (typeof CURRENCIES)[number]

export const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = {
  CRC: 2,
  USD: 2,
}

export const isCurrencyCode = (value: string): value is CurrencyCode =>
  (CURRENCIES as readonly string[]).includes(value)
```

- [x] **Paso 4: Implementar `Money`**

`api/src/shared/kernel/money.ts`:

```ts
import { Decimal } from 'decimal.js'
import { MINOR_UNIT_EXPONENT, type CurrencyCode } from './currency.js'
import { err, ok, type Result } from './result.js'

export class CurrencyMismatchError extends Error {
  readonly code = 'CURRENCY_MISMATCH'

  constructor(
    readonly left: CurrencyCode,
    readonly right: CurrencyCode,
  ) {
    super(`No se pueden operar montos en ${left} y ${right}`)
    this.name = 'CurrencyMismatchError'
  }
}

const RATIO_SCALE = 1_000_000

export class Money {
  private constructor(
    readonly minorUnits: bigint,
    readonly currency: CurrencyCode,
  ) {}

  static fromMinorUnits(minorUnits: bigint, currency: CurrencyCode): Money {
    return new Money(minorUnits, currency)
  }

  static fromDecimal(value: Decimal.Value, currency: CurrencyCode): Money {
    const factor = new Decimal(10).pow(MINOR_UNIT_EXPONENT[currency])
    const minor = new Decimal(value).mul(factor).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    return new Money(BigInt(minor.toFixed(0)), currency)
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0n, currency)
  }

  add(other: Money): Result<Money, CurrencyMismatchError> {
    if (other.currency !== this.currency) {
      return err(new CurrencyMismatchError(this.currency, other.currency))
    }
    return ok(new Money(this.minorUnits + other.minorUnits, this.currency))
  }

  subtract(other: Money): Result<Money, CurrencyMismatchError> {
    if (other.currency !== this.currency) {
      return err(new CurrencyMismatchError(this.currency, other.currency))
    }
    return ok(new Money(this.minorUnits - other.minorUnits, this.currency))
  }

  multiply(factor: Decimal.Value): Money {
    const product = this.toDecimal().mul(factor)
    return Money.fromDecimal(product, this.currency)
  }

  // Reparte el monto entre las razones dadas distribuyendo el residuo unidad por unidad,
  // de modo que la suma de las partes siempre iguala el total.
  allocate(ratios: readonly number[]): Money[] {
    if (ratios.length === 0) {
      throw new RangeError('allocate requiere al menos una razón')
    }
    const scaled = ratios.map((ratio) => BigInt(Math.round(ratio * RATIO_SCALE)))
    const totalRatio = scaled.reduce((acc, value) => acc + value, 0n)
    if (totalRatio <= 0n) {
      throw new RangeError('La suma de las razones debe ser mayor que cero')
    }

    const negative = this.minorUnits < 0n
    const magnitude = negative ? -this.minorUnits : this.minorUnits
    const shares = scaled.map((ratio) => (magnitude * ratio) / totalRatio)

    let remainder = magnitude - shares.reduce((acc, value) => acc + value, 0n)
    for (let index = 0; remainder > 0n; index = (index + 1) % shares.length, remainder -= 1n) {
      shares[index] = (shares[index] ?? 0n) + 1n
    }

    return shares.map((share) => new Money(negative ? -share : share, this.currency))
  }

  compareTo(other: Money): Result<number, CurrencyMismatchError> {
    if (other.currency !== this.currency) {
      return err(new CurrencyMismatchError(this.currency, other.currency))
    }
    if (this.minorUnits > other.minorUnits) return ok(1)
    if (this.minorUnits < other.minorUnits) return ok(-1)
    return ok(0)
  }

  negate(): Money {
    return new Money(-this.minorUnits, this.currency)
  }

  isZero(): boolean {
    return this.minorUnits === 0n
  }

  isNegative(): boolean {
    return this.minorUnits < 0n
  }

  equals(other: Money): boolean {
    return this.minorUnits === other.minorUnits && this.currency === other.currency
  }

  toDecimal(): Decimal {
    return new Decimal(this.minorUnits.toString()).div(
      new Decimal(10).pow(MINOR_UNIT_EXPONENT[this.currency]),
    )
  }

  toJSON(): { minorUnits: string; currency: CurrencyCode } {
    return { minorUnits: this.minorUnits.toString(), currency: this.currency }
  }
}
```

- [x] **Paso 5: Correr el test y confirmar que pasa**

```bash
cd api && npm test -- money && npm run typecheck && npm run lint
```

Esperado: 11 tests pasando.

- [x] **Paso 6: Commit**

```bash
git add api/src/shared/kernel
git commit -m "✨ feat: Money con aritmética exacta y reparto sin pérdida de unidades"
```

**Acceptance criteria:**
- [x] `allocate` cuadra exactamente en repartos no divisibles, incluido el caso negativo
- [x] Operar CRC con USD devuelve `Err` con `CurrencyMismatchError`, no lanza
- [x] `toJSON` serializa el monto como string, sin `Number`

---

### Tarea 3: `Percentage`, `InterestRate` y `DateRange`

**Descripción:** Completar el kernel. `Percentage` valida el rango 0–100. `InterestRate` guarda la tasa anual y la convención de capitalización, y expone la tasa mensual — con 0 % como caso válido de primera clase, porque la deuda con los padres no tiene interés. `DateRange` es el rango que consume el proveedor de tipos de cambio en la rebanada 2.

**Alcance:** S · **Dependencias:** Tarea 1

**Files:**
- Create: `api/src/shared/kernel/percentage.ts`, `api/src/shared/kernel/interest-rate.ts`, `api/src/shared/kernel/date-range.ts`, `api/src/shared/kernel/index.ts`
- Test: `api/src/shared/kernel/percentage.spec.ts`, `api/src/shared/kernel/interest-rate.spec.ts`, `api/src/shared/kernel/date-range.spec.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `err` de `./result.js`
- Produces:
  - `class Percentage`: `static create(value: Decimal.Value): Result<Percentage, RangeError>` · `readonly value: Decimal` · `toFraction(): Decimal` · `toString(): string`
  - `type Compounding = 'MONTHLY' | 'ANNUAL'`
  - `class InterestRate`: `static create(annualPercentage: Decimal.Value, compounding: Compounding): Result<InterestRate, RangeError>` · `static zero(): InterestRate` · `readonly annualPercentage: Decimal` · `readonly compounding: Compounding` · `monthlyRate(): Decimal` · `isZero(): boolean`
  - `class DateRange`: `static create(from: Date, to: Date): Result<DateRange, RangeError>` · `readonly from: Date` · `readonly to: Date` · `contains(date: Date): boolean` · `days(): number`
  - `src/shared/kernel/index.ts` reexporta todo el kernel

- [x] **Paso 1: Escribir los tests que fallan**

`api/src/shared/kernel/percentage.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Percentage } from './percentage.js'
import { isErr, unwrap } from './result.js'

describe('Percentage', () => {
  it('acepta los extremos del rango', () => {
    expect(unwrap(Percentage.create(0)).value.toNumber()).toBe(0)
    expect(unwrap(Percentage.create(100)).value.toNumber()).toBe(100)
  })

  it('convierte a fracción', () => {
    expect(unwrap(Percentage.create('12.5')).toFraction().toString()).toBe('0.125')
  })

  it('rechaza valores fuera del rango 0–100', () => {
    expect(isErr(Percentage.create(-1))).toBe(true)
    expect(isErr(Percentage.create('100.01'))).toBe(true)
  })
})
```

`api/src/shared/kernel/interest-rate.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { InterestRate } from './interest-rate.js'
import { isErr, unwrap } from './result.js'

describe('InterestRate', () => {
  it('deriva la tasa mensual de una tasa nominal con capitalización mensual', () => {
    const rate = unwrap(InterestRate.create(12, 'MONTHLY'))
    expect(rate.monthlyRate().toString()).toBe('0.01')
  })

  it('deriva la tasa mensual equivalente de una tasa efectiva anual', () => {
    const rate = unwrap(InterestRate.create(12, 'ANNUAL'))
    expect(rate.monthlyRate().toDecimalPlaces(8).toString()).toBe('0.00948879')
  })

  it('trata el 0 % como una tasa válida, no como ausencia de tasa', () => {
    const rate = unwrap(InterestRate.create(0, 'MONTHLY'))
    expect(rate.isZero()).toBe(true)
    expect(rate.monthlyRate().toNumber()).toBe(0)
    expect(InterestRate.zero().isZero()).toBe(true)
  })

  it('rechaza tasas negativas', () => {
    expect(isErr(InterestRate.create(-0.5, 'MONTHLY'))).toBe(true)
  })
})
```

`api/src/shared/kernel/date-range.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DateRange } from './date-range.js'
import { isErr, unwrap } from './result.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('DateRange', () => {
  it('cuenta los días incluyendo ambos extremos', () => {
    expect(unwrap(DateRange.create(utc('2026-01-01'), utc('2026-01-31'))).days()).toBe(31)
  })

  it('acepta un rango de un solo día', () => {
    expect(unwrap(DateRange.create(utc('2026-01-01'), utc('2026-01-01'))).days()).toBe(1)
  })

  it('reconoce si una fecha cae dentro', () => {
    const range = unwrap(DateRange.create(utc('2026-01-01'), utc('2026-01-31')))
    expect(range.contains(utc('2026-01-15'))).toBe(true)
    expect(range.contains(utc('2026-02-01'))).toBe(false)
  })

  it('rechaza un rango invertido', () => {
    expect(isErr(DateRange.create(utc('2026-01-31'), utc('2026-01-01')))).toBe(true)
  })
})
```

- [x] **Paso 2: Correr los tests y confirmar que fallan**

```bash
cd api && npm test -- percentage interest-rate date-range
```

Esperado: FAIL, los tres módulos sin resolver.

- [x] **Paso 3: Implementar `Percentage`**

`api/src/shared/kernel/percentage.ts`:

```ts
import { Decimal } from 'decimal.js'
import { err, ok, type Result } from './result.js'

export class Percentage {
  private constructor(readonly value: Decimal) {}

  static create(value: Decimal.Value): Result<Percentage, RangeError> {
    const decimal = new Decimal(value)
    if (!decimal.isFinite() || decimal.lessThan(0) || decimal.greaterThan(100)) {
      return err(new RangeError(`Un porcentaje debe estar entre 0 y 100, se recibió ${decimal.toString()}`))
    }
    return ok(new Percentage(decimal))
  }

  toFraction(): Decimal {
    return this.value.div(100)
  }

  toString(): string {
    return `${this.value.toString()}%`
  }
}
```

- [x] **Paso 4: Implementar `InterestRate`**

`api/src/shared/kernel/interest-rate.ts`:

```ts
import { Decimal } from 'decimal.js'
import { err, ok, type Result } from './result.js'

export type Compounding = 'MONTHLY' | 'ANNUAL'

const MONTHS_PER_YEAR = 12

export class InterestRate {
  private constructor(
    readonly annualPercentage: Decimal,
    readonly compounding: Compounding,
  ) {}

  static create(annualPercentage: Decimal.Value, compounding: Compounding): Result<InterestRate, RangeError> {
    const decimal = new Decimal(annualPercentage)
    if (!decimal.isFinite() || decimal.lessThan(0)) {
      return err(new RangeError(`Una tasa no puede ser negativa, se recibió ${decimal.toString()}`))
    }
    return ok(new InterestRate(decimal, compounding))
  }

  static zero(): InterestRate {
    return new InterestRate(new Decimal(0), 'MONTHLY')
  }

  // MONTHLY: tasa nominal anual dividida en doce. ANNUAL: tasa efectiva anual, se desanualiza.
  monthlyRate(): Decimal {
    const annualFraction = this.annualPercentage.div(100)
    if (this.compounding === 'MONTHLY') {
      return annualFraction.div(MONTHS_PER_YEAR)
    }
    return annualFraction.plus(1).pow(new Decimal(1).div(MONTHS_PER_YEAR)).minus(1)
  }

  isZero(): boolean {
    return this.annualPercentage.isZero()
  }
}
```

- [x] **Paso 5: Implementar `DateRange`**

`api/src/shared/kernel/date-range.ts`:

```ts
import { err, ok, type Result } from './result.js'

const MS_PER_DAY = 86_400_000

const atUtcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export class DateRange {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  static create(from: Date, to: Date): Result<DateRange, RangeError> {
    const start = atUtcMidnight(from)
    const end = atUtcMidnight(to)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return err(new RangeError('El rango recibió una fecha inválida'))
    }
    if (start.getTime() > end.getTime()) {
      return err(new RangeError('La fecha inicial no puede ser posterior a la final'))
    }
    return ok(new DateRange(start, end))
  }

  contains(date: Date): boolean {
    const time = atUtcMidnight(date).getTime()
    return time >= this.from.getTime() && time <= this.to.getTime()
  }

  days(): number {
    return (this.to.getTime() - this.from.getTime()) / MS_PER_DAY + 1
  }
}
```

- [x] **Paso 6: Barril del kernel**

`api/src/shared/kernel/index.ts`:

```ts
export * from './currency.js'
export * from './date-range.js'
export * from './interest-rate.js'
export * from './money.js'
export * from './percentage.js'
export * from './result.js'
```

- [x] **Paso 7: Correr todo y confirmar que pasa**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

Esperado: 25 tests pasando.

- [x] **Paso 8: Commit**

```bash
git add api/src/shared/kernel
git commit -m "✨ feat: Percentage, InterestRate y DateRange en el kernel"
```

**Acceptance criteria:**
- [x] `InterestRate.create(0, 'MONTHLY')` es válida y `monthlyRate()` devuelve 0
- [x] Un porcentaje de 100,01 es rechazado con `Err`
- [x] `DateRange` de un solo día cuenta 1 día

---

### Checkpoint: kernel completo (tras las Tareas 1–3)

- [x] `cd api && npm test` → 25 tests pasando
- [x] `npm run typecheck` y `npm run lint` limpios
- [x] Ningún archivo de `shared/kernel/` importa Nest, Prisma ni HTTP
- [x] Revisión con Emilio antes de seguir

---

### Tarea 4: Tabla de amortización

**Descripción:** La función pura de la que cuelga todo el módulo. Produce las cuotas con desglose capital/interés y saldo, para los tres tipos de deuda. El último pago absorbe el residuo de redondeo para que el saldo final sea exactamente cero. Sin E/S, sin dependencias de framework.

**Alcance:** M · **Dependencias:** Tareas 2 y 3

**Files:**
- Create: `api/src/modules/debts/domain/debt-kind.ts`
- Create: `api/src/modules/debts/domain/add-months.ts`
- Create: `api/src/modules/debts/domain/amortization.ts`
- Test: `api/src/modules/debts/domain/amortization.spec.ts`, `api/src/modules/debts/domain/add-months.spec.ts`

**Interfaces:**
- Consumes: `Money`, `InterestRate` del kernel
- Produces:
  - `const DEBT_KINDS = ['FRENCH', 'FIXED_PRINCIPAL', 'INTEREST_FREE'] as const`, `type DebtKind = (typeof DEBT_KINDS)[number]`
  - `addMonths(date: Date, months: number): Date`
  - `interface Installment { number: number; dueDate: Date; payment: Money; principal: Money; interest: Money; balance: Money }`
  - `interface ScheduleParams { principal: Money; rate: InterestRate; termMonths: number; startDate: Date; kind: DebtKind }`
  - `class AmortizationSchedule` con `readonly installments: readonly Installment[]` · `get totalInterest(): Money` · `get totalPaid(): Money` · `get finalBalance(): Money` · `installmentNumber(n: number): Installment | undefined` · `installmentDueIn(year: number, month: number): Installment | undefined`
  - `buildSchedule(params: ScheduleParams): AmortizationSchedule`

#### Tabla de referencia calculada a mano

Capital ₡100.000,00 · tasa nominal anual 12 % con capitalización mensual (i = 0,01 mensual) · 3 cuotas · francés.

Cuota = P·i / (1 − (1+i)^−n) = 1.000 / 0,029409852 = ₡34.002,2112 → **₡34.002,21** (3.400.221 céntimos)

| # | Saldo inicial | Interés | Capital | Cuota | Saldo final |
|---|---|---|---|---|---|
| 1 | 10.000.000 | 100.000 | 3.300.221 | 3.400.221 | 6.699.779 |
| 2 | 6.699.779 | 66.998 | 3.333.223 | 3.400.221 | 3.366.556 |
| 3 | 3.366.556 | 33.666 | 3.366.556 | **3.400.222** | **0** |

Interés total: 200.664 · Pagado total: 10.200.664 = 10.000.000 + 200.664.

La cuota 3 vale un céntimo más que las anteriores: ahí se absorbe el residuo. Es la condición que hace que el saldo final sea exactamente cero y no «casi cero».

- [x] **Paso 1: Escribir el test de `addMonths` que falla**

`api/src/modules/debts/domain/add-months.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { addMonths } from './add-months.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('addMonths', () => {
  it('avanza meses conservando el día', () => {
    expect(addMonths(utc('2026-01-15'), 3).toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  it('cruza el fin de año', () => {
    expect(addMonths(utc('2026-11-10'), 3).toISOString()).toBe('2027-02-10T00:00:00.000Z')
  })

  it('recorta el día cuando el mes destino es más corto', () => {
    expect(addMonths(utc('2026-01-31'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(addMonths(utc('2028-01-31'), 1).toISOString()).toBe('2028-02-29T00:00:00.000Z')
  })
})
```

- [x] **Paso 2: Escribir el test de amortización que falla**

`api/src/modules/debts/domain/amortization.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { buildSchedule } from './amortization.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const PRINCIPAL = crc(10_000_000n)
const START = utc('2026-01-15')

describe('buildSchedule — francés', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: unwrap(InterestRate.create(12, 'MONTHLY')),
    termMonths: 3,
    startDate: START,
    kind: 'FRENCH',
  })

  it('reproduce la tabla calculada a mano', () => {
    expect(
      schedule.installments.map((i) => [
        i.number,
        i.interest.minorUnits,
        i.principal.minorUnits,
        i.payment.minorUnits,
        i.balance.minorUnits,
      ]),
    ).toEqual([
      [1, 100_000n, 3_300_221n, 3_400_221n, 6_699_779n],
      [2, 66_998n, 3_333_223n, 3_400_221n, 3_366_556n],
      [3, 33_666n, 3_366_556n, 3_400_222n, 0n],
    ])
  })

  it('el último pago absorbe el residuo y deja el saldo en cero exacto', () => {
    expect(schedule.finalBalance.minorUnits).toBe(0n)
    expect(schedule.installments.at(-1)?.payment.minorUnits).toBe(3_400_222n)
  })

  it('los totales cuadran con el capital más el interés', () => {
    expect(schedule.totalInterest.minorUnits).toBe(200_664n)
    expect(schedule.totalPaid.minorUnits).toBe(10_200_664n)
  })

  it('vence un mes después del inicio y avanza mes a mes', () => {
    expect(schedule.installments.map((i) => i.dueDate.toISOString())).toEqual([
      '2026-02-15T00:00:00.000Z',
      '2026-03-15T00:00:00.000Z',
      '2026-04-15T00:00:00.000Z',
    ])
  })
})

describe('buildSchedule — sin interés', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: InterestRate.zero(),
    termMonths: 3,
    startDate: START,
    kind: 'INTEREST_FREE',
  })

  it('reparte el capital sin cobrar interés y cuadra al céntimo', () => {
    expect(schedule.installments.map((i) => i.payment.minorUnits)).toEqual([
      3_333_334n,
      3_333_333n,
      3_333_333n,
    ])
    expect(schedule.totalInterest.minorUnits).toBe(0n)
    expect(schedule.totalPaid.minorUnits).toBe(10_000_000n)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildSchedule — francés con tasa 0 %', () => {
  it('se comporta como un reparto simple, no divide por cero', () => {
    const schedule = buildSchedule({
      principal: PRINCIPAL,
      rate: InterestRate.zero(),
      termMonths: 3,
      startDate: START,
      kind: 'FRENCH',
    })
    expect(schedule.totalInterest.minorUnits).toBe(0n)
    expect(schedule.totalPaid.minorUnits).toBe(10_000_000n)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildSchedule — capital fijo', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: unwrap(InterestRate.create(12, 'MONTHLY')),
    termMonths: 3,
    startDate: START,
    kind: 'FIXED_PRINCIPAL',
  })

  it('amortiza capital constante y cuota decreciente', () => {
    expect(
      schedule.installments.map((i) => [i.principal.minorUnits, i.interest.minorUnits, i.payment.minorUnits]),
    ).toEqual([
      [3_333_334n, 100_000n, 3_433_334n],
      [3_333_333n, 66_667n, 3_400_000n],
      [3_333_333n, 33_333n, 3_366_666n],
    ])
    expect(schedule.totalInterest.minorUnits).toBe(200_000n)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildSchedule — búsquedas', () => {
  const schedule = buildSchedule({
    principal: PRINCIPAL,
    rate: InterestRate.zero(),
    termMonths: 3,
    startDate: START,
    kind: 'INTEREST_FREE',
  })

  it('encuentra la cuota que vence en un mes dado', () => {
    expect(schedule.installmentDueIn(2026, 3)?.number).toBe(2)
    expect(schedule.installmentDueIn(2026, 12)).toBeUndefined()
  })
})

describe('buildSchedule — entradas inválidas', () => {
  it('rechaza un plazo no positivo', () => {
    expect(() =>
      buildSchedule({
        principal: PRINCIPAL,
        rate: InterestRate.zero(),
        termMonths: 0,
        startDate: START,
        kind: 'FRENCH',
      }),
    ).toThrow(RangeError)
  })
})
```

- [x] **Paso 3: Correr los tests y confirmar que fallan**

```bash
cd api && npm test -- amortization add-months
```

Esperado: FAIL, módulos sin resolver.

- [x] **Paso 4: Implementar `debt-kind` y `add-months`**

`api/src/modules/debts/domain/debt-kind.ts`:

```ts
export const DEBT_KINDS = ['FRENCH', 'FIXED_PRINCIPAL', 'INTEREST_FREE'] as const

export type DebtKind = (typeof DEBT_KINDS)[number]

export const isDebtKind = (value: string): value is DebtKind =>
  (DEBT_KINDS as readonly string[]).includes(value)
```

`api/src/modules/debts/domain/add-months.ts`:

```ts
const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

// Avanza meses en UTC recortando el día cuando el mes destino es más corto:
// el 31 de enero más un mes es el 28 o 29 de febrero, no el 2 o 3 de marzo.
export const addMonths = (date: Date, months: number): Date => {
  const year = date.getUTCFullYear()
  const monthIndex = date.getUTCMonth() + months
  const day = Math.min(
    date.getUTCDate(),
    lastDayOfMonth(year + Math.floor(monthIndex / 12), ((monthIndex % 12) + 12) % 12),
  )
  return new Date(Date.UTC(year, monthIndex, day))
}
```

- [x] **Paso 5: Implementar la amortización**

`api/src/modules/debts/domain/amortization.ts`:

```ts
import { Decimal } from 'decimal.js'
import type { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { addMonths } from './add-months.js'
import type { DebtKind } from './debt-kind.js'

export interface Installment {
  readonly number: number
  readonly dueDate: Date
  readonly payment: Money
  readonly principal: Money
  readonly interest: Money
  readonly balance: Money
}

export interface ScheduleParams {
  readonly principal: Money
  readonly rate: InterestRate
  readonly termMonths: number
  readonly startDate: Date
  readonly kind: DebtKind
}

export class AmortizationSchedule {
  constructor(
    readonly installments: readonly Installment[],
    private readonly currency: Money,
  ) {}

  get totalInterest(): Money {
    return this.installments.reduce(
      (acc, installment) => unwrap(acc.add(installment.interest)),
      Money.zero(this.currency.currency),
    )
  }

  get totalPaid(): Money {
    return this.installments.reduce(
      (acc, installment) => unwrap(acc.add(installment.payment)),
      Money.zero(this.currency.currency),
    )
  }

  get finalBalance(): Money {
    return this.installments.at(-1)?.balance ?? Money.zero(this.currency.currency)
  }

  installmentNumber(n: number): Installment | undefined {
    return this.installments.find((installment) => installment.number === n)
  }

  installmentDueIn(year: number, month: number): Installment | undefined {
    return this.installments.find(
      (installment) =>
        installment.dueDate.getUTCFullYear() === year && installment.dueDate.getUTCMonth() + 1 === month,
    )
  }
}

// Cuota del sistema francés: P·i / (1 − (1+i)^−n). Con i = 0 el denominador se anula,
// así que ese caso se reparte linealmente.
const frenchPayment = (principal: Money, monthlyRate: Decimal, termMonths: number): Money => {
  const factor = monthlyRate.plus(1).pow(-termMonths)
  const value = principal.toDecimal().mul(monthlyRate).div(new Decimal(1).minus(factor))
  return Money.fromDecimal(value, principal.currency)
}

const principalShares = (principal: Money, termMonths: number): Money[] =>
  principal.allocate(Array.from({ length: termMonths }, () => 1))

export const buildSchedule = (params: ScheduleParams): AmortizationSchedule => {
  const { principal, rate, termMonths, startDate, kind } = params
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError(`El plazo debe ser un entero positivo, se recibió ${termMonths}`)
  }

  const monthlyRate = kind === 'INTEREST_FREE' ? new Decimal(0) : rate.monthlyRate()
  const usesFixedPayment = kind === 'FRENCH' && !monthlyRate.isZero()
  const fixedPayment = usesFixedPayment ? frenchPayment(principal, monthlyRate, termMonths) : undefined
  const shares = usesFixedPayment ? undefined : principalShares(principal, termMonths)

  const installments: Installment[] = []
  let balance = principal

  for (let number = 1; number <= termMonths; number += 1) {
    const isLast = number === termMonths
    const interest = balance.multiply(monthlyRate)

    // La última cuota amortiza todo el saldo restante: ahí se absorbe el residuo de redondeo
    // y el saldo final queda en cero exacto, no en «casi cero».
    const principalPortion = isLast
      ? balance
      : (fixedPayment
          ? unwrap(fixedPayment.subtract(interest))
          : (shares?.[number - 1] ?? Money.zero(principal.currency)))

    const payment = unwrap(principalPortion.add(interest))
    balance = unwrap(balance.subtract(principalPortion))

    installments.push({
      number,
      dueDate: addMonths(startDate, number),
      payment,
      principal: principalPortion,
      interest,
      balance,
    })
  }

  return new AmortizationSchedule(installments, principal)
}
```

- [x] **Paso 6: Correr los tests y confirmar que pasan**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

Esperado: todos los tests de amortización en verde, incluida la tabla calculada a mano fila por fila.

- [x] **Paso 7: Commit**

```bash
git add api/src/modules/debts
git commit -m "✨ feat: tabla de amortización francesa, capital fijo y sin interés"
```

**Acceptance criteria:**
- [x] La tabla francesa coincide fila por fila con la tabla de referencia
- [x] El saldo final es `0n` exacto en los tres tipos
- [x] Una deuda con tasa 0 % no divide por cero y reparte el capital linealmente
- [x] Un plazo de 0 meses lanza `RangeError`

---

### Tarea 5: Agregado `Debt` y simulación de abono extraordinario

**Descripción:** La raíz de agregado y una de las preguntas obligatorias del spec: *¿cuánto interés se ahorra abonando un monto extra?* `applyExtraPayment` construye los dos escenarios y los compara. Dos modos: acortar el plazo manteniendo la cuota, o bajar la cuota manteniendo el plazo.

El agregado cubre las dos direcciones: `BORROWED` es lo que Emilio debe, `LENT` es un préstamo que él otorgó. La matemática es idéntica — mismo capital, misma tasa, misma tabla —, lo único que cambia es el signo del flujo, y eso lo resuelve quien consume el agregado. Un módulo aparte para préstamos otorgados duplicaría la amortización entera para invertir un signo.

**Alcance:** M · **Dependencias:** Tarea 4

**Files:**
- Create: `api/src/modules/debts/domain/extra-payment.ts`
- Create: `api/src/modules/debts/domain/debt.ts`
- Test: `api/src/modules/debts/domain/extra-payment.spec.ts`, `api/src/modules/debts/domain/debt.spec.ts`

**Interfaces:**
- Consumes: `buildSchedule`, `AmortizationSchedule`, `Installment`, `DebtKind`, `addMonths`, kernel
- Produces:
  - `type ExtraPaymentMode = 'REDUCE_TERM' | 'REDUCE_PAYMENT'`
  - `interface ExtraPayment { amount: Money; afterInstallment: number; mode: ExtraPaymentMode }`
  - `interface DebtProjection { baseline: AmortizationSchedule; withExtraPayment: AmortizationSchedule; extraPayment: Money; interestSaved: Money; monthsSaved: number; totalPaidWithExtra: Money }`
  - `buildScheduleWithExtraPayment(params: ScheduleParams, extra: ExtraPayment): AmortizationSchedule`
  - `type DebtDirection = 'BORROWED' | 'LENT'`
  - `interface DebtProps { id: string; name: string; counterparty: string; principal: Money; rate: InterestRate; termMonths: number; startDate: Date; kind: DebtKind; direction: DebtDirection; budgetBucket: string | null }`
  - `class Debt`: `static create(props: DebtProps): Result<Debt, RangeError>` · getters `id`, `name`, `counterparty`, `principal`, `rate`, `termMonths`, `startDate`, `kind`, `direction`, `budgetBucket` · `isBorrowed(): boolean` · `isLent(): boolean` · `schedule(): AmortizationSchedule` · `payoffDate(): Date` · `balanceAt(date: Date): Money` · `installmentDueIn(year: number, month: number): Money` · `applyExtraPayment(extra: ExtraPayment): Result<DebtProjection, RangeError>` · `toProps(): DebtProps`

`budgetBucket` es `string | null`: una deuda propia pertenece a una cubeta del presupuesto, un préstamo otorgado no consume ninguna. Que el tipo lo diga evita tener que recordarlo.

- [x] **Paso 1: Escribir el test de abono extraordinario que falla**

`api/src/modules/debts/domain/extra-payment.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { buildSchedule, type ScheduleParams } from './amortization.js'
import { buildScheduleWithExtraPayment } from './extra-payment.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const interestFree = (termMonths: number): ScheduleParams => ({
  principal: crc(10_000_000n),
  rate: InterestRate.zero(),
  termMonths,
  startDate: utc('2026-01-15'),
  kind: 'INTEREST_FREE',
})

describe('buildScheduleWithExtraPayment — acortar plazo', () => {
  it('termina antes manteniendo la cuota', () => {
    const schedule = buildScheduleWithExtraPayment(interestFree(4), {
      amount: crc(2_500_000n),
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })

    expect(schedule.installments.map((i) => i.payment.minorUnits)).toEqual([
      2_500_000n,
      2_500_000n,
      2_500_000n,
    ])
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildScheduleWithExtraPayment — bajar cuota', () => {
  it('mantiene el plazo y redistribuye el saldo restante', () => {
    const schedule = buildScheduleWithExtraPayment(interestFree(4), {
      amount: crc(2_000_000n),
      afterInstallment: 1,
      mode: 'REDUCE_PAYMENT',
    })

    expect(schedule.installments.map((i) => i.payment.minorUnits)).toEqual([
      2_500_000n,
      1_833_334n,
      1_833_333n,
      1_833_333n,
    ])
    expect(schedule.installments).toHaveLength(4)
    expect(schedule.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildScheduleWithExtraPayment — con interés', () => {
  const params: ScheduleParams = {
    principal: crc(10_000_000n),
    rate: unwrap(InterestRate.create(12, 'MONTHLY')),
    termMonths: 12,
    startDate: utc('2026-01-15'),
    kind: 'FRENCH',
  }

  it('paga menos interés y termina antes al acortar plazo', () => {
    const baseline = buildSchedule(params)
    const improved = buildScheduleWithExtraPayment(params, {
      amount: crc(3_000_000n),
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })

    expect(improved.installments.length).toBeLessThan(baseline.installments.length)
    expect(improved.totalInterest.minorUnits).toBeLessThan(baseline.totalInterest.minorUnits)
    expect(improved.finalBalance.minorUnits).toBe(0n)
  })

  it('el capital amortizado más el abono iguala el capital original', () => {
    const extra = crc(3_000_000n)
    const improved = buildScheduleWithExtraPayment(params, {
      amount: extra,
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })
    const amortized = improved.installments.reduce((acc, i) => acc + i.principal.minorUnits, 0n)
    expect(amortized + extra.minorUnits).toBe(10_000_000n)
  })

  it('un abono que cubre el saldo cierra la deuda en esa cuota', () => {
    const improved = buildScheduleWithExtraPayment(params, {
      amount: crc(50_000_000n),
      afterInstallment: 1,
      mode: 'REDUCE_TERM',
    })
    expect(improved.installments).toHaveLength(1)
    expect(improved.finalBalance.minorUnits).toBe(0n)
  })
})

describe('buildScheduleWithExtraPayment — entradas inválidas', () => {
  it('rechaza un abono posterior a la última cuota', () => {
    expect(() =>
      buildScheduleWithExtraPayment(interestFree(4), {
        amount: crc(1_000n),
        afterInstallment: 9,
        mode: 'REDUCE_TERM',
      }),
    ).toThrow(RangeError)
  })

  it('rechaza un abono de monto no positivo', () => {
    expect(() =>
      buildScheduleWithExtraPayment(interestFree(4), {
        amount: crc(0n),
        afterInstallment: 1,
        mode: 'REDUCE_TERM',
      }),
    ).toThrow(RangeError)
  })
})
```

- [x] **Paso 2: Correr el test y confirmar que falla**

```bash
cd api && npm test -- extra-payment
```

Esperado: FAIL, `./extra-payment.js` sin resolver.

- [x] **Paso 3: Implementar el abono extraordinario**

`api/src/modules/debts/domain/extra-payment.ts`:

```ts
import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { addMonths } from './add-months.js'
import { AmortizationSchedule, buildSchedule, type Installment, type ScheduleParams } from './amortization.js'

export type ExtraPaymentMode = 'REDUCE_TERM' | 'REDUCE_PAYMENT'

export interface ExtraPayment {
  readonly amount: Money
  readonly afterInstallment: number
  readonly mode: ExtraPaymentMode
}

export interface DebtProjection {
  readonly baseline: AmortizationSchedule
  readonly withExtraPayment: AmortizationSchedule
  readonly extraPayment: Money
  readonly interestSaved: Money
  readonly monthsSaved: number
  readonly totalPaidWithExtra: Money
}

export const buildScheduleWithExtraPayment = (
  params: ScheduleParams,
  extra: ExtraPayment,
): AmortizationSchedule => {
  if (extra.amount.isZero() || extra.amount.isNegative()) {
    throw new RangeError('El abono extraordinario debe ser mayor que cero')
  }
  if (!Number.isInteger(extra.afterInstallment) || extra.afterInstallment < 1) {
    throw new RangeError('El abono debe aplicarse después de una cuota válida')
  }

  const baseline = buildSchedule(params)
  if (extra.afterInstallment >= baseline.installments.length) {
    throw new RangeError('El abono no puede aplicarse después de la última cuota')
  }

  const kept = baseline.installments.slice(0, extra.afterInstallment)
  const balanceAfterKept = kept.at(-1)?.balance ?? params.principal
  const remainingBalance = unwrap(balanceAfterKept.subtract(extra.amount))

  if (!remainingBalance.isNegative() && !remainingBalance.isZero()) {
    const monthlyRate = params.kind === 'INTEREST_FREE' ? new Decimal(0) : params.rate.monthlyRate()
    const remainingTerm = baseline.installments.length - kept.length
    const continuation =
      extra.mode === 'REDUCE_TERM'
        ? continueWithFixedPayment(remainingBalance, monthlyRate, keptPayment(baseline, kept))
        : buildSchedule({
            ...params,
            principal: remainingBalance,
            termMonths: remainingTerm,
          }).installments

    return new AmortizationSchedule(
      [...kept, ...renumber(continuation, kept.length, params.startDate)],
      params.principal,
    )
  }

  // El abono cubre todo el saldo: la deuda queda cerrada en la cuota en que se aplica,
  // así que esa cuota deja de arrastrar saldo y el plan termina ahí.
  return new AmortizationSchedule(closedAt(kept, params.principal.currency), params.principal)
}

const closedAt = (kept: readonly Installment[], currency: CurrencyCode): Installment[] => {
  const last = kept.at(-1)
  if (!last) return [...kept]
  return [...kept.slice(0, -1), { ...last, balance: Money.zero(currency) }]
}

const keptPayment = (baseline: AmortizationSchedule, kept: readonly Installment[]): Money =>
  baseline.installments[kept.length]?.payment ?? kept.at(-1)?.payment ?? Money.zero(baseline.totalPaid.currency)

// Mantiene la cuota original y consume el saldo hasta agotarlo; la última absorbe el residuo.
const continueWithFixedPayment = (
  startingBalance: Money,
  monthlyRate: Decimal,
  payment: Money,
): Installment[] => {
  const installments: Installment[] = []
  let balance = startingBalance
  let guard = 0

  while (!balance.isZero() && !balance.isNegative()) {
    guard += 1
    if (guard > 1200) throw new RangeError('La cuota no alcanza a cubrir el interés: la deuda no se amortiza')

    const interest = balance.multiply(monthlyRate)
    const available = unwrap(payment.subtract(interest))
    if (!available.isNegative() && !available.isZero() && unwrap(available.compareTo(balance)) >= 0) {
      installments.push(draft(balance, interest, unwrap(balance.add(interest)), Money.zero(balance.currency)))
      balance = Money.zero(balance.currency)
      continue
    }
    if (available.isZero() || available.isNegative()) {
      throw new RangeError('La cuota no alcanza a cubrir el interés: la deuda no se amortiza')
    }
    balance = unwrap(balance.subtract(available))
    installments.push(draft(available, interest, payment, balance))
  }

  return installments
}

const draft = (principal: Money, interest: Money, payment: Money, balance: Money): Installment => ({
  number: 0,
  dueDate: new Date(0),
  payment,
  principal,
  interest,
  balance,
})

const renumber = (
  installments: readonly Installment[],
  offset: number,
  startDate: Date,
): Installment[] =>
  installments.map((installment, index) => ({
    ...installment,
    number: offset + index + 1,
    dueDate: addMonths(startDate, offset + index + 1),
  }))
```

- [x] **Paso 4: Escribir el test de `Debt` que falla**

`api/src/modules/debts/domain/debt.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Debt, type DebtProps } from './debt.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const props = (overrides: Partial<DebtProps> = {}): DebtProps => ({
  id: 'conape',
  name: 'CONAPE',
  counterparty: 'CONAPE',
  principal: crc(10_000_000n),
  rate: unwrap(InterestRate.create(12, 'MONTHLY')),
  termMonths: 3,
  startDate: utc('2026-01-15'),
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
  ...overrides,
})

describe('Debt', () => {
  it('expone la tabla de amortización de su propio estado', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.schedule().installments).toHaveLength(3)
    expect(debt.schedule().finalBalance.minorUnits).toBe(0n)
  })

  it('reporta la fecha en que queda libre la cuota', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.payoffDate().toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  it('reporta el saldo a una fecha dada', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.balanceAt(utc('2026-01-01')).minorUnits).toBe(10_000_000n)
    expect(debt.balanceAt(utc('2026-02-20')).minorUnits).toBe(6_699_779n)
    expect(debt.balanceAt(utc('2027-01-01')).minorUnits).toBe(0n)
  })

  it('reporta la cuota que vence en un mes, y cero si ya terminó', () => {
    const debt = unwrap(Debt.create(props()))
    expect(debt.installmentDueIn(2026, 2).minorUnits).toBe(3_400_221n)
    expect(debt.installmentDueIn(2026, 12).minorUnits).toBe(0n)
  })

  it('acepta una deuda sin interés, como la de los padres', () => {
    const debt = unwrap(
      Debt.create(props({ rate: InterestRate.zero(), kind: 'INTEREST_FREE', name: 'Papás' })),
    )
    expect(debt.schedule().totalInterest.minorUnits).toBe(0n)
  })

  it('compara los escenarios con y sin abono', () => {
    const debt = unwrap(Debt.create(props({ termMonths: 12 })))
    const projection = unwrap(
      debt.applyExtraPayment({ amount: crc(3_000_000n), afterInstallment: 1, mode: 'REDUCE_TERM' }),
    )

    expect(projection.monthsSaved).toBeGreaterThan(0)
    expect(projection.interestSaved.minorUnits).toBeGreaterThan(0n)
    expect(projection.interestSaved.minorUnits).toBe(
      projection.baseline.totalInterest.minorUnits - projection.withExtraPayment.totalInterest.minorUnits,
    )
    expect(projection.totalPaidWithExtra.minorUnits).toBe(
      projection.withExtraPayment.totalPaid.minorUnits + 3_000_000n,
    )
  })

  it('devuelve Err en vez de lanzar cuando el abono es inválido', () => {
    const debt = unwrap(Debt.create(props()))
    const result = debt.applyExtraPayment({ amount: crc(0n), afterInstallment: 1, mode: 'REDUCE_TERM' })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza un capital no positivo y un plazo no positivo', () => {
    expect(isErr(Debt.create(props({ principal: crc(0n) })))).toBe(true)
    expect(isErr(Debt.create(props({ termMonths: 0 })))).toBe(true)
  })

  it('rechaza un nombre o una contraparte vacíos', () => {
    expect(isErr(Debt.create(props({ name: '   ' })))).toBe(true)
    expect(isErr(Debt.create(props({ counterparty: '  ' })))).toBe(true)
  })

  it('modela un préstamo otorgado con la misma tabla que la deuda equivalente', () => {
    const lent = unwrap(
      Debt.create(
        props({
          id: 'andres',
          name: 'Préstamo a Andrés',
          counterparty: 'Andrés',
          direction: 'LENT',
          budgetBucket: null,
        }),
      ),
    )
    expect(lent.isLent()).toBe(true)
    expect(lent.isBorrowed()).toBe(false)
    expect(lent.schedule().installments.map((i) => i.payment.minorUnits)).toEqual(
      unwrap(Debt.create(props())).schedule().installments.map((i) => i.payment.minorUnits),
    )
  })

  it('exige cubeta a lo que se debe y la prohíbe en lo que se presta', () => {
    expect(isErr(Debt.create(props({ budgetBucket: null })))).toBe(true)
    expect(isErr(Debt.create(props({ direction: 'LENT', budgetBucket: 'necesidades' })))).toBe(true)
  })
})
```

- [x] **Paso 5: Correr el test y confirmar que falla**

```bash
cd api && npm test -- debt.spec
```

Esperado: FAIL, `./debt.js` sin resolver.

- [x] **Paso 6: Implementar `Debt`**

`api/src/modules/debts/domain/debt.ts`:

```ts
import type { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import { buildSchedule, type AmortizationSchedule, type ScheduleParams } from './amortization.js'
import type { DebtKind } from './debt-kind.js'
import {
  buildScheduleWithExtraPayment,
  type DebtProjection,
  type ExtraPayment,
} from './extra-payment.js'

export type DebtDirection = 'BORROWED' | 'LENT'

export interface DebtProps {
  readonly id: string
  readonly name: string
  readonly counterparty: string
  readonly principal: Money
  readonly rate: InterestRate
  readonly termMonths: number
  readonly startDate: Date
  readonly kind: DebtKind
  readonly direction: DebtDirection
  readonly budgetBucket: string | null
}

export class Debt {
  private constructor(private readonly props: DebtProps) {}

  static create(props: DebtProps): Result<Debt, RangeError> {
    if (props.principal.isZero() || props.principal.isNegative()) {
      return err(new RangeError('El capital de una deuda debe ser mayor que cero'))
    }
    if (!Number.isInteger(props.termMonths) || props.termMonths <= 0) {
      return err(new RangeError('El plazo debe ser un entero positivo de meses'))
    }
    if (props.name.trim().length === 0) {
      return err(new RangeError('La deuda necesita un nombre'))
    }
    if (props.counterparty.trim().length === 0) {
      return err(new RangeError('La deuda necesita una contraparte'))
    }
    // Lo que se debe consume una cubeta del presupuesto; lo que se presta no consume ninguna.
    if (props.direction === 'BORROWED' && (props.budgetBucket?.trim() ?? '').length === 0) {
      return err(new RangeError('Una deuda propia necesita una cubeta de presupuesto'))
    }
    if (props.direction === 'LENT' && props.budgetBucket !== null) {
      return err(new RangeError('Un préstamo otorgado no pertenece a ninguna cubeta de presupuesto'))
    }
    return ok(
      new Debt({ ...props, name: props.name.trim(), counterparty: props.counterparty.trim() }),
    )
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get counterparty(): string { return this.props.counterparty }
  get principal(): Money { return this.props.principal }
  get rate(): InterestRate { return this.props.rate }
  get termMonths(): number { return this.props.termMonths }
  get startDate(): Date { return this.props.startDate }
  get kind(): DebtKind { return this.props.kind }
  get direction(): DebtDirection { return this.props.direction }
  get budgetBucket(): string | null { return this.props.budgetBucket }

  isBorrowed(): boolean { return this.props.direction === 'BORROWED' }

  isLent(): boolean { return this.props.direction === 'LENT' }

  schedule(): AmortizationSchedule {
    return buildSchedule(this.scheduleParams())
  }

  payoffDate(): Date {
    const last = this.schedule().installments.at(-1)
    if (!last) throw new RangeError('Una deuda válida siempre tiene al menos una cuota')
    return last.dueDate
  }

  balanceAt(date: Date): Money {
    const installments = this.schedule().installments
    const due = installments.filter((installment) => installment.dueDate.getTime() <= date.getTime())
    return due.at(-1)?.balance ?? this.props.principal
  }

  installmentDueIn(year: number, month: number): Money {
    return this.schedule().installmentDueIn(year, month)?.payment ?? Money.zero(this.props.principal.currency)
  }

  applyExtraPayment(extra: ExtraPayment): Result<DebtProjection, RangeError> {
    try {
      const baseline = this.schedule()
      const withExtraPayment = buildScheduleWithExtraPayment(this.scheduleParams(), extra)
      return ok({
        baseline,
        withExtraPayment,
        extraPayment: extra.amount,
        interestSaved: unwrap(baseline.totalInterest.subtract(withExtraPayment.totalInterest)),
        monthsSaved: baseline.installments.length - withExtraPayment.installments.length,
        totalPaidWithExtra: unwrap(withExtraPayment.totalPaid.add(extra.amount)),
      })
    } catch (cause) {
      return err(cause instanceof RangeError ? cause : new RangeError('No se pudo simular el abono'))
    }
  }

  toProps(): DebtProps {
    return { ...this.props }
  }

  private scheduleParams(): ScheduleParams {
    return {
      principal: this.props.principal,
      rate: this.props.rate,
      termMonths: this.props.termMonths,
      startDate: this.props.startDate,
      kind: this.props.kind,
    }
  }
}
```

- [x] **Paso 7: Correr todo y confirmar que pasa**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

- [x] **Paso 8: Commit**

```bash
git add api/src/modules/debts
git commit -m "✨ feat: agregado Debt y simulación de abono extraordinario"
```

**Acceptance criteria:**
- [x] `applyExtraPayment` en modo `REDUCE_TERM` acorta el plazo y baja el interés total
- [x] En modo `REDUCE_PAYMENT` el plazo se mantiene y la cuota baja
- [x] El capital amortizado más el abono iguala el capital original
- [x] Un abono inválido devuelve `Err`, no lanza hacia el llamador
- [x] Un préstamo otorgado produce exactamente la misma tabla que la deuda equivalente
- [x] El tipo obliga: `BORROWED` sin cubeta es `Err`, `LENT` con cubeta es `Err`

---

### Tarea 6: Estrategias de pago y puerto del repositorio

**Descripción:** `PayoffStrategy` decide a qué deuda dirigir el excedente mensual: avalancha (mayor tasa primero, óptimo financiero), bola de nieve (menor saldo primero, óptimo psicológico) u orden manual. Es un Strategy de verdad — tres criterios distintos para la misma decisión —, no un patrón puesto por decorado.

Las tres ignoran los préstamos otorgados: una deuda con `direction: LENT` no compite por el excedente mensual, lo alimenta. Filtrarlo en un solo lugar evita que cada estrategia tenga que acordarse. La tarea cierra además el puerto del repositorio, que es lo que la Tarea 7 implementa.

**Alcance:** S · **Dependencias:** Tarea 5

**Files:**
- Create: `api/src/modules/debts/domain/payoff-strategy.ts`
- Create: `api/src/modules/debts/domain/debt-repository.port.ts`
- Test: `api/src/modules/debts/domain/payoff-strategy.spec.ts`

**Interfaces:**
- Consumes: `Debt` de `./debt.js`
- Produces:
  - `type PayoffStrategyId = 'avalanche' | 'snowball' | 'manual'`
  - `interface PayoffStrategy { readonly id: PayoffStrategyId; order(debts: readonly Debt[], at: Date): Debt[] }`
  - `class AvalancheStrategy implements PayoffStrategy`
  - `class SnowballStrategy implements PayoffStrategy`
  - `class ManualOrderStrategy implements PayoffStrategy` — constructor `(orderedIds: readonly string[])`
  - `payoffStrategyFor(id: PayoffStrategyId, orderedIds?: readonly string[]): PayoffStrategy`
  - `const DEBT_REPOSITORY: unique symbol`
  - `interface DebtRepository { findAll(page: number, pageSize: number, direction?: DebtDirection): Promise<DebtPage>; findById(id: string): Promise<Debt | null>; save(debt: Debt): Promise<void>; delete(id: string): Promise<boolean> }`

- [x] **Paso 1: Escribir el test que falla**

`api/src/modules/debts/domain/payoff-strategy.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { Debt } from './debt.js'
import {
  AvalancheStrategy,
  ManualOrderStrategy,
  SnowballStrategy,
  payoffStrategyFor,
} from './payoff-strategy.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const AT = utc('2026-01-01')

const debt = (id: string, principalMinor: bigint, annualPercentage: number) =>
  unwrap(
    Debt.create({
      id,
      name: id,
      counterparty: id,
      principal: crc(principalMinor),
      rate: unwrap(InterestRate.create(annualPercentage, 'MONTHLY')),
      termMonths: 24,
      startDate: utc('2026-01-15'),
      kind: 'FRENCH',
      direction: 'BORROWED',
      budgetBucket: 'necesidades',
    }),
  )

const conape = debt('conape', 50_000_000n, 9)
const tarjeta = debt('tarjeta', 8_000_000n, 42)
const papas = debt('papas', 20_000_000n, 0)
const prestado = unwrap(
  Debt.create({
    ...conape.toProps(),
    id: 'andres',
    name: 'Préstamo a Andrés',
    counterparty: 'Andrés',
    direction: 'LENT',
    budgetBucket: null,
  }),
)

describe('AvalancheStrategy', () => {
  it('ataca primero la tasa más alta', () => {
    const ordered = new AvalancheStrategy().order([conape, papas, tarjeta], AT)
    expect(ordered.map((d) => d.id)).toEqual(['tarjeta', 'conape', 'papas'])
  })
})

describe('SnowballStrategy', () => {
  it('ataca primero el saldo más chico', () => {
    const ordered = new SnowballStrategy().order([conape, papas, tarjeta], AT)
    expect(ordered.map((d) => d.id)).toEqual(['tarjeta', 'papas', 'conape'])
  })
})

describe('ManualOrderStrategy', () => {
  it('respeta el orden declarado', () => {
    const ordered = new ManualOrderStrategy(['papas', 'tarjeta', 'conape']).order(
      [conape, papas, tarjeta],
      AT,
    )
    expect(ordered.map((d) => d.id)).toEqual(['papas', 'tarjeta', 'conape'])
  })

  it('manda al final las deudas no listadas, sin perderlas', () => {
    const ordered = new ManualOrderStrategy(['tarjeta']).order([conape, papas, tarjeta], AT)
    expect(ordered[0]?.id).toBe('tarjeta')
    expect(ordered).toHaveLength(3)
  })
})

describe('todas las estrategias', () => {
  it('no mutan la lista recibida ni pierden deudas', () => {
    const input = [conape, papas, tarjeta]
    for (const strategy of [new AvalancheStrategy(), new SnowballStrategy(), new ManualOrderStrategy([])]) {
      const ordered = strategy.order(input, AT)
      expect(ordered).toHaveLength(3)
      expect(input.map((d) => d.id)).toEqual(['conape', 'papas', 'tarjeta'])
    }
  })

  it('dejan al final las deudas ya saldadas a la fecha dada', () => {
    const ordered = new AvalancheStrategy().order([conape, tarjeta], utc('2040-01-01'))
    expect(ordered).toHaveLength(2)
  })

  it('ignoran los préstamos otorgados: no compiten por el excedente', () => {
    for (const strategy of [
      new AvalancheStrategy(),
      new SnowballStrategy(),
      new ManualOrderStrategy(['andres', 'tarjeta']),
    ]) {
      const ordered = strategy.order([conape, prestado, tarjeta], AT)
      expect(ordered.map((d) => d.id)).not.toContain('andres')
      expect(ordered).toHaveLength(2)
    }
  })
})

describe('payoffStrategyFor', () => {
  it('resuelve cada identificador a su implementación', () => {
    expect(payoffStrategyFor('avalanche')).toBeInstanceOf(AvalancheStrategy)
    expect(payoffStrategyFor('snowball')).toBeInstanceOf(SnowballStrategy)
    expect(payoffStrategyFor('manual', ['tarjeta'])).toBeInstanceOf(ManualOrderStrategy)
  })
})
```

- [x] **Paso 2: Correr el test y confirmar que falla**

```bash
cd api && npm test -- payoff-strategy
```

Esperado: FAIL, `./payoff-strategy.js` sin resolver.

- [x] **Paso 3: Implementar las estrategias**

`api/src/modules/debts/domain/payoff-strategy.ts`:

```ts
import type { Debt } from './debt.js'

export type PayoffStrategyId = 'avalanche' | 'snowball' | 'manual'

export interface PayoffStrategy {
  readonly id: PayoffStrategyId
  order(debts: readonly Debt[], at: Date): Debt[]
}

// Un préstamo otorgado no compite por el excedente, lo alimenta: queda fuera del orden.
// Una deuda ya saldada tampoco compite, pero se conserva al final para no perderla de vista.
const settledLast = (debts: readonly Debt[], at: Date) => {
  const active: Debt[] = []
  const settled: Debt[] = []
  for (const debt of debts) {
    if (debt.isLent()) continue
    if (debt.balanceAt(at).isZero()) settled.push(debt)
    else active.push(debt)
  }
  return { active, settled }
}

export class AvalancheStrategy implements PayoffStrategy {
  readonly id = 'avalanche' as const

  order(debts: readonly Debt[], at: Date): Debt[] {
    const { active, settled } = settledLast(debts, at)
    const sorted = [...active].sort((a, b) =>
      b.rate.monthlyRate().comparedTo(a.rate.monthlyRate()),
    )
    return [...sorted, ...settled]
  }
}

export class SnowballStrategy implements PayoffStrategy {
  readonly id = 'snowball' as const

  order(debts: readonly Debt[], at: Date): Debt[] {
    const { active, settled } = settledLast(debts, at)
    const sorted = [...active].sort((a, b) => {
      const left = a.balanceAt(at).minorUnits
      const right = b.balanceAt(at).minorUnits
      if (left === right) return 0
      return left < right ? -1 : 1
    })
    return [...sorted, ...settled]
  }
}

export class ManualOrderStrategy implements PayoffStrategy {
  readonly id = 'manual' as const

  constructor(private readonly orderedIds: readonly string[]) {}

  order(debts: readonly Debt[], at: Date): Debt[] {
    const { active, settled } = settledLast(debts, at)
    const rank = (debt: Debt) => {
      const index = this.orderedIds.indexOf(debt.id)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }
    const sorted = [...active].sort((a, b) => rank(a) - rank(b))
    return [...sorted, ...settled]
  }
}

export const payoffStrategyFor = (
  id: PayoffStrategyId,
  orderedIds: readonly string[] = [],
): PayoffStrategy => {
  switch (id) {
    case 'avalanche':
      return new AvalancheStrategy()
    case 'snowball':
      return new SnowballStrategy()
    case 'manual':
      return new ManualOrderStrategy(orderedIds)
  }
}
```

- [x] **Paso 4: Declarar el puerto del repositorio**

`api/src/modules/debts/domain/debt-repository.port.ts`:

```ts
import type { Debt, DebtDirection } from './debt.js'

export interface DebtPage {
  readonly items: Debt[]
  readonly totalItems: number
}

export interface DebtRepository {
  // `direction` filtra entre lo que se debe y lo que se prestó; sin él, devuelve ambos.
  findAll(page: number, pageSize: number, direction?: DebtDirection): Promise<DebtPage>
  findById(id: string): Promise<Debt | null>
  save(debt: Debt): Promise<void>
  delete(id: string): Promise<boolean>
}

// Token de inyección. Una interfaz de TypeScript se borra en tiempo de ejecución,
// así que el contenedor de Nest necesita un símbolo para resolver la implementación.
export const DEBT_REPOSITORY = Symbol('DEBT_REPOSITORY')
```

- [x] **Paso 5: Correr todo y confirmar que pasa**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

- [x] **Paso 6: Commit**

```bash
git add api/src/modules/debts/domain
git commit -m "✨ feat: estrategias de pago avalancha, bola de nieve y manual"
```

**Acceptance criteria:**
- [x] Avalancha ordena por tasa descendente; bola de nieve por saldo ascendente
- [x] El orden manual manda al final las deudas no listadas sin perderlas
- [x] Ninguna estrategia muta la lista recibida
- [x] Ninguna estrategia incluye préstamos otorgados en el orden de pago
- [x] `DEBT_REPOSITORY` es un `Symbol`, no un string

---

### Checkpoint: dominio de deudas completo (tras las Tareas 4–6)

- [x] `cd api && npm test` → dominio completo en verde
- [x] Ningún archivo bajo `modules/debts/domain/` importa Nest, Prisma ni HTTP (`npm run lint` lo verifica)
- [x] La tabla francesa de referencia coincide fila por fila
- [x] Revisión con Emilio antes de tocar persistencia

---

### Tarea 7: Persistencia — Prisma 7 y repositorio de deudas

**Descripción:** Guardar deudas en Postgres sin que Prisma se filtre hacia arriba. El repositorio traduce fila ↔ agregado en sus dos direcciones y devuelve `Debt`, nunca un tipo generado. Se prueba contra un Postgres real con Testcontainers, no contra un doble.

**Alcance:** M · **Dependencias:** Tarea 6

**Files:**
- Create: `api/prisma/schema.prisma`, `api/prisma.config.ts`
- Create: `api/src/shared/prisma/prisma.service.ts`
- Create: `api/src/modules/debts/infrastructure/debt.mapper.ts`
- Create: `api/src/modules/debts/infrastructure/prisma-debt.repository.ts`
- Create: `api/test/postgres-container.ts`
- Test: `api/src/modules/debts/infrastructure/prisma-debt.repository.spec.ts`

**Interfaces:**
- Consumes: `Debt`, `DebtRepository`, `DEBT_REPOSITORY`, kernel
- Produces:
  - `class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`
  - `toDomain(row: DebtRow): Debt` y `toRow(debt: Debt): DebtRow` en `debt.mapper.ts`
  - `class PrismaDebtRepository implements DebtRepository`
  - `startPostgres(): Promise<{ url: string; stop: () => Promise<void> }>` en `test/postgres-container.ts`

- [ ] **Paso 1: Instalar Prisma pineado**

```bash
cd api
npm install prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.0
npm install -D @testcontainers/postgresql@12.1.0 @types/pg@8.16.0
```

`prisma` sin versión traería `8.0.0-rc.15`, porque su dist-tag `latest` apunta a un release candidate mientras `@prisma/client` estable va en 7.10.0. Instalarlos desalineados rompe la generación del cliente.

- [ ] **Paso 2: Configuración de Prisma 7**

`api/prisma.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

```bash
npm install -D dotenv@17.2.3
```

En Prisma 7 la CLI ya no carga `.env` sola y el `datasource` sale de este archivo, no del bloque del schema.

`api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  moduleFormat = "esm"
}

datasource db {
  provider = "postgresql"
}

enum DebtKind {
  FRENCH
  FIXED_PRINCIPAL
  INTEREST_FREE
}

enum Compounding {
  MONTHLY
  ANNUAL
}

enum DebtDirection {
  BORROWED
  LENT
}

model Debt {
  id             String        @id @default(uuid(7))
  name           String
  counterparty   String
  principalMinor BigInt
  currency       String        @db.Char(3)
  annualRate     Decimal       @db.Decimal(9, 6)
  compounding    Compounding
  termMonths     Int
  startDate      DateTime      @db.Date
  kind           DebtKind
  direction      DebtDirection @default(BORROWED)
  budgetBucket   String?
  createdAt      DateTime      @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime      @updatedAt @db.Timestamptz(3)

  @@index([direction])
  @@map("debts")
}
```

`principalMinor` es `BigInt` porque `Int` es int32 y se desborda: ₡56.349.293 son 5.634.929.300 céntimos. `startDate` es `@db.Date` porque el inicio de una deuda es un día, no un instante. Las marcas de tiempo son `timestamptz`.

`budgetBucket` es opcional en la base porque un préstamo otorgado no pertenece a ninguna cubeta; la regla de que una deuda propia sí la necesita vive en el dominio, no en el esquema. El índice sobre `direction` sostiene la consulta que separa las dos listas de la pantalla.

- [ ] **Paso 3: Generar el cliente y la primera migración**

```bash
cd .. && docker compose up -d db && cd api
cp ../.env.example ../.env 2>/dev/null || true
npx prisma validate
npx prisma migrate dev --name init_debts
npx prisma generate
```

Si `prisma validate` reclama que falta `url` en el bloque `datasource`, agregar `url = env("DATABASE_URL")` al schema y volver a correrlo; el resto del plan no cambia.

- [ ] **Paso 4: Servicio de Prisma con el driver adapter**

`api/src/shared/prisma/prisma.service.ts`:

```ts
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../generated/prisma/client.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
```

En Prisma 7 el adapter es obligatorio en tiempo de ejecución: el cliente ya no arma la conexión por su cuenta.

- [ ] **Paso 5: Escribir el test de integración que falla**

`api/test/postgres-container.ts`:

```ts
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

export interface RunningPostgres {
  url: string
  stop: () => Promise<void>
}

export const startPostgres = async (): Promise<RunningPostgres> => {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:18-alpine',
  ).start()
  const url = container.getConnectionUri()

  execSync('npx prisma migrate deploy', {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })

  return { url, stop: () => container.stop() }
}
```

`api/src/modules/debts/infrastructure/prisma-debt.repository.spec.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { Debt } from '../domain/debt.js'
import { startPostgres, type RunningPostgres } from '../../../../test/postgres-container.js'
import { PrismaDebtRepository } from './prisma-debt.repository.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaDebtRepository

const conape = () =>
  unwrap(
    Debt.create({
      id: '0199a1c0-0000-7000-8000-000000000001',
      name: 'CONAPE',
      counterparty: 'CONAPE',
      principal: crc(5_634_929_300n),
      rate: unwrap(InterestRate.create('9.500000', 'MONTHLY')),
      termMonths: 120,
      startDate: utc('2026-01-15'),
      kind: 'FRENCH',
      direction: 'BORROWED',
      budgetBucket: 'necesidades',
    }),
  )

const prestamoOtorgado = () =>
  unwrap(
    Debt.create({
      ...conape().toProps(),
      id: '0199a1c0-0000-7000-8000-0000000000aa',
      name: 'Préstamo a Andrés',
      counterparty: 'Andrés',
      direction: 'LENT',
      budgetBucket: null,
    }),
  )

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = new PrismaDebtRepository(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.debt.deleteMany()
})

describe('PrismaDebtRepository', () => {
  it('guarda y recupera una deuda sin perder precisión en el monto', async () => {
    const debt = conape()
    await repository.save(debt)

    const found = await repository.findById(debt.id)
    expect(found?.principal.minorUnits).toBe(5_634_929_300n)
    expect(found?.principal.currency).toBe('CRC')
  })

  it('conserva la tasa como decimal exacto', async () => {
    await repository.save(conape())
    const found = await repository.findById('0199a1c0-0000-7000-8000-000000000001')
    expect(found?.rate.annualPercentage.toString()).toBe('9.5')
    expect(found?.rate.compounding).toBe('MONTHLY')
  })

  it('devuelve una entidad de dominio, no una fila de Prisma', async () => {
    await repository.save(conape())
    const found = await repository.findById('0199a1c0-0000-7000-8000-000000000001')
    expect(found).toBeInstanceOf(Debt)
    expect(found?.schedule().finalBalance.minorUnits).toBe(0n)
  })

  it('conserva la fecha de inicio como día, sin desplazamiento de zona', async () => {
    await repository.save(conape())
    const found = await repository.findById('0199a1c0-0000-7000-8000-000000000001')
    expect(found?.startDate.toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })

  it('actualiza en lugar de duplicar cuando se guarda dos veces el mismo id', async () => {
    await repository.save(conape())
    await repository.save(conape())
    const page = await repository.findAll(1, 10)
    expect(page.totalItems).toBe(1)
  })

  it('filtra por dirección cuando se le pide', async () => {
    await repository.save(conape())
    await repository.save(prestamoOtorgado())

    const prestados = await repository.findAll(1, 10, 'LENT')
    expect(prestados.totalItems).toBe(1)
    expect(prestados.items[0]?.direction).toBe('LENT')

    const todas = await repository.findAll(1, 10)
    expect(todas.totalItems).toBe(2)
  })

  it('pagina y reporta el total', async () => {
    for (let index = 1; index <= 3; index += 1) {
      await repository.save(
        unwrap(
          Debt.create({
            ...conape().toProps(),
            id: `0199a1c0-0000-7000-8000-00000000000${index}`,
            name: `Deuda ${index}`,
          }),
        ),
      )
    }
    const page = await repository.findAll(2, 2)
    expect(page.items).toHaveLength(1)
    expect(page.totalItems).toBe(3)
  })

  it('guarda un préstamo otorgado sin cubeta y lo recupera como tal', async () => {
    await repository.save(prestamoOtorgado())
    const found = await repository.findById('0199a1c0-0000-7000-8000-0000000000aa')
    expect(found?.direction).toBe('LENT')
    expect(found?.budgetBucket).toBeNull()
    expect(found?.isLent()).toBe(true)
  })

  it('devuelve null para un id inexistente y false al borrarlo', async () => {
    expect(await repository.findById('0199a1c0-0000-7000-8000-00000000ffff')).toBeNull()
    expect(await repository.delete('0199a1c0-0000-7000-8000-00000000ffff')).toBe(false)
  })

  it('borra una deuda existente', async () => {
    const debt = conape()
    await repository.save(debt)
    expect(await repository.delete(debt.id)).toBe(true)
    expect(await repository.findById(debt.id)).toBeNull()
  })
})
```

- [ ] **Paso 6: Correr el test y confirmar que falla**

```bash
cd api && npm test -- prisma-debt
```

Esperado: FAIL, `./prisma-debt.repository.js` sin resolver.

- [ ] **Paso 7: Implementar el mapeo**

`api/src/modules/debts/infrastructure/debt.mapper.ts`:

```ts
import { Decimal } from 'decimal.js'
import { isCurrencyCode } from '../../../shared/kernel/currency.js'
import { InterestRate, type Compounding } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import type { DebtDirection } from '../domain/debt.js'
import { Debt } from '../domain/debt.js'
import type { DebtKind } from '../domain/debt-kind.js'

export interface DebtRow {
  id: string
  name: string
  counterparty: string
  principalMinor: bigint
  currency: string
  annualRate: { toString(): string }
  compounding: Compounding
  termMonths: number
  startDate: Date
  kind: DebtKind
  direction: DebtDirection
  budgetBucket: string | null
}

export const toDomain = (row: DebtRow): Debt => {
  if (!isCurrencyCode(row.currency)) {
    throw new RangeError(`Moneda desconocida en la base de datos: ${row.currency}`)
  }
  const rate = unwrap(InterestRate.create(new Decimal(row.annualRate.toString()), row.compounding))
  return unwrap(
    Debt.create({
      id: row.id,
      name: row.name,
      counterparty: row.counterparty,
      principal: Money.fromMinorUnits(row.principalMinor, row.currency),
      rate,
      termMonths: row.termMonths,
      startDate: row.startDate,
      kind: row.kind,
      direction: row.direction,
      budgetBucket: row.budgetBucket,
    }),
  )
}

export const toRow = (debt: Debt): Omit<DebtRow, 'annualRate'> & { annualRate: string } => ({
  id: debt.id,
  name: debt.name,
  counterparty: debt.counterparty,
  principalMinor: debt.principal.minorUnits,
  currency: debt.principal.currency,
  annualRate: debt.rate.annualPercentage.toFixed(6),
  compounding: debt.rate.compounding,
  termMonths: debt.termMonths,
  startDate: debt.startDate,
  kind: debt.kind,
  direction: debt.direction,
  budgetBucket: debt.budgetBucket,
})
```

- [ ] **Paso 8: Implementar el repositorio**

`api/src/modules/debts/infrastructure/prisma-debt.repository.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { Debt, DebtDirection } from '../domain/debt.js'
import type { DebtPage, DebtRepository } from '../domain/debt-repository.port.js'
import { toDomain, toRow, type DebtRow } from './debt.mapper.js'

@Injectable()
export class PrismaDebtRepository implements DebtRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number, direction?: DebtDirection): Promise<DebtPage> {
    const where = direction ? { direction } : {}
    const [rows, totalItems] = await Promise.all([
      this.prisma.debt.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.debt.count({ where }),
    ])
    return { items: rows.map((row) => toDomain(row as DebtRow)), totalItems }
  }

  async findById(id: string): Promise<Debt | null> {
    const row = await this.prisma.debt.findUnique({ where: { id } })
    return row ? toDomain(row as DebtRow) : null
  }

  async save(debt: Debt): Promise<void> {
    const row = toRow(debt)
    const { id, ...rest } = row
    await this.prisma.debt.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    })
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.debt.deleteMany({ where: { id } })
    return count > 0
  }
}
```

- [ ] **Paso 9: Correr el test y confirmar que pasa**

```bash
cd api && npm test -- prisma-debt
```

Esperado: 8 tests pasando. La primera corrida descarga la imagen de Postgres y tarda; por eso el `beforeAll` tiene 180 s de tope.

- [ ] **Paso 10: Verificar la suite completa y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api .gitignore
git commit -m "✨ feat: persistencia de deudas con Prisma 7 y pruebas contra Postgres real"
```

**Acceptance criteria:**
- [ ] ₡56.349.293 sobrevive el viaje de ida y vuelta como `5_634_929_300n`
- [ ] La tasa vuelve como decimal exacto, sin error de punto flotante
- [ ] `findById` devuelve una instancia de `Debt`, comprobado con `toBeInstanceOf`
- [ ] `startDate` vuelve como el mismo día, sin desplazamiento de zona horaria
- [ ] Guardar dos veces el mismo id actualiza, no duplica
- [ ] Un préstamo otorgado se persiste con `budgetBucket` nulo y vuelve como `LENT`

---

### Tarea 8: Bordes HTTP y endpoints de deudas

**Descripción:** Levantar la aplicación de Nest con los bordes que el spec exige: variables de entorno validadas al arrancar, un único formato de error en toda la API, validación con Zod solo en el borde y paginación en toda lista. Encima de eso, el CRUD de deudas. La regla de que el dominio no sabe de HTTP se paga acá: los casos de uso traducen `Result` a excepciones HTTP, el dominio no.

**Alcance:** L · **Dependencias:** Tarea 7

**Files:**
- Create: `api/src/shared/config/env.ts`
- Create: `api/src/shared/http/api-error.ts`, `api/src/shared/http/all-exceptions.filter.ts`, `api/src/shared/http/zod-validation.pipe.ts`, `api/src/shared/http/pagination.ts`, `api/src/shared/http/money.schema.ts`
- Create: `api/src/modules/debts/infrastructure/debt.schemas.ts`, `api/src/modules/debts/infrastructure/debt.presenter.ts`, `api/src/modules/debts/infrastructure/debts.controller.ts`, `api/src/modules/debts/debts.module.ts`
- Create: `api/src/modules/debts/application/list-debts.use-case.ts`, `create-debt.use-case.ts`, `get-debt.use-case.ts`, `update-debt.use-case.ts`, `delete-debt.use-case.ts`
- Create: `api/src/app.module.ts`, `api/src/main.ts`
- Test: `api/src/modules/debts/infrastructure/debts.controller.spec.ts`, `api/src/shared/config/env.spec.ts`

**Interfaces:**
- Consumes: `Debt`, `DebtRepository`, `DEBT_REPOSITORY`, `PrismaService`, kernel
- Produces:
  - `envSchema` y `loadEnv(source: NodeJS.ProcessEnv): Env` en `config/env.ts`
  - `class NotFoundError`, `class ConflictError`, `class SemanticValidationError` en `http/api-error.ts`
  - `class AllExceptionsFilter implements ExceptionFilter`
  - `class ZodValidationPipe implements PipeTransform` — constructor `(schema: ZodType)`
  - `paginationQuerySchema`, `paginated<T>(items: T[], page: number, pageSize: number, totalItems: number)`
  - `moneySchema` — `{ minorUnits: string; currency: CurrencyCode }`
  - `createDebtSchema`, `updateDebtSchema`, `debtResponseSchema` en `debt.schemas.ts`
  - `toDebtResponse(debt: Debt): DebtResponse` en `debt.presenter.ts`
  - Casos de uso: `ListDebtsUseCase.execute(page, pageSize, direction?)`, `CreateDebtUseCase.execute(input)`, `GetDebtUseCase.execute(id)`, `UpdateDebtUseCase.execute(id, input)`, `DeleteDebtUseCase.execute(id)`

- [ ] **Paso 1: Instalar Nest y Zod**

```bash
cd api
npm install @nestjs/common@12.0.3 @nestjs/core@12.0.3 @nestjs/platform-express@12.0.3 @nestjs/config@12.0.0 @nestjs/swagger@12.0.1 reflect-metadata@0.2.2 rxjs@7.8.2 zod@4.6.5
npm install -D @nestjs/cli@12.0.3 @nestjs/testing@12.0.3 supertest@7.2.2 @types/supertest@7.2.1
```

- [ ] **Paso 2: Escribir el test de configuración que falla**

`api/src/shared/config/env.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

const valid = {
  DATABASE_URL: 'postgresql://finanzas:finanzas@localhost:5433/finanzas',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
}

describe('loadEnv', () => {
  it('acepta una configuración completa y convierte el puerto a número', () => {
    expect(loadEnv(valid).PORT).toBe(3000)
  })

  it('falla al arrancar si falta la cadena de conexión', () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
  })

  it('falla si el puerto no es un número', () => {
    expect(() => loadEnv({ ...valid, PORT: 'tres mil' })).toThrow(/PORT/)
  })

  it('usa un valor por defecto para el origen permitido', () => {
    expect(loadEnv({ ...valid, CORS_ORIGIN: undefined }).CORS_ORIGIN).toBe('http://localhost:5173')
  })
})
```

- [ ] **Paso 3: Implementar la configuración**

`api/src/shared/config/env.ts`:

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL es obligatoria' }),
  PORT: z.coerce.number({ error: 'PORT debe ser un número' }).int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

export type Env = z.infer<typeof envSchema>

// Falla al arrancar, no en la primera petición: una credencial ausente tiene que ser
// un error de arranque ruidoso, no un 500 silencioso tres horas después.
export const loadEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
```

En Zod 4 el parámetro de error es `error`, no `message`, y el formateo legible es `z.prettifyError`.

- [ ] **Paso 4: Formato único de error**

`api/src/shared/http/api-error.ts`:

```ts
export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  readonly code = 'CONFLICT'
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class SemanticValidationError extends Error {
  readonly code = 'SEMANTIC_VALIDATION_ERROR'
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'SemanticValidationError'
  }
}
```

`api/src/shared/http/all-exceptions.filter.ts`:

```ts
import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'
import { ConflictError, NotFoundError, SemanticValidationError } from './api-error.js'

interface ErrorBody {
  error: { code: string; message: string; details?: unknown }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, body } = this.describe(exception)
    if (status >= 500) this.logger.error(exception)
    response.status(status).json(body)
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof NotFoundError) {
      return { status: 404, body: { error: { code: exception.code, message: exception.message } } }
    }
    if (exception instanceof ConflictError) {
      return { status: 409, body: { error: { code: exception.code, message: exception.message } } }
    }
    if (exception instanceof SemanticValidationError) {
      return {
        status: 422,
        body: {
          error: { code: exception.code, message: exception.message, details: exception.details },
        },
      }
    }
    if (exception instanceof HttpException) {
      const payload = exception.getResponse()
      const isStructured = typeof payload === 'object' && payload !== null && 'error' in payload
      return {
        status: exception.getStatus(),
        body: isStructured
          ? (payload as ErrorBody)
          : { error: { code: 'HTTP_ERROR', message: exception.message } },
      }
    }
    // Un error no previsto no expone su mensaje: el detalle va al log, no al cliente.
    return {
      status: 500,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } },
    }
  }
}
```

`api/src/shared/http/zod-validation.pipe.ts`:

```ts
import { BadRequestException, type PipeTransform } from '@nestjs/common'
import { z, type ZodType } from 'zod'

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La solicitud tiene campos inválidos',
          details: z.treeifyError(result.error),
        },
      })
    }
    return result.data
  }
}
```

- [ ] **Paso 5: Paginación y representación de montos**

`api/src/shared/http/pagination.ts`:

```ts
import { z } from 'zod'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

export const paginated = <T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number,
): Paginated<T> => ({
  data,
  pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
})
```

`api/src/shared/http/money.schema.ts`:

```ts
import { z } from 'zod'
import { CURRENCIES } from '../kernel/currency.js'
import { Money } from '../kernel/money.js'

// En el borde un monto viaja como string para no pasar por el doble de JavaScript.
export const moneySchema = z
  .object({
    minorUnits: z.string().regex(/^-?\d+$/, { error: 'El monto debe ser un entero en unidades mínimas' }),
    currency: z.enum(CURRENCIES),
  })
  .meta({ title: 'Money' })

export type MoneyDto = z.infer<typeof moneySchema>

export const toMoney = (dto: MoneyDto): Money =>
  Money.fromMinorUnits(BigInt(dto.minorUnits), dto.currency)

export const fromMoney = (money: Money): MoneyDto => money.toJSON()
```

Cada schema expuesto lleva `title` en su `meta`, para que los tipos generados en el frontend salgan con nombre propio y no como objetos anónimos.

- [ ] **Paso 6: Escribir el test del controlador que falla**

`api/src/modules/debts/infrastructure/debts.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../../test/postgres-container.js'
import { DebtsModule } from '../debts.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const nuevaDeuda = {
  name: 'CONAPE',
  counterparty: 'CONAPE',
  principal: { minorUnits: '5634929300', currency: 'CRC' },
  annualRate: '9.5',
  compounding: 'MONTHLY',
  termMonths: 120,
  startDate: '2026-01-15',
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
}

beforeAll(async () => {
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [DebtsModule] })
    .overrideProvider(PrismaService)
    .useValue(new PrismaService(postgres.url))
    .compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()
  prisma = app.get(PrismaService)
}, 180_000)

afterAll(async () => {
  await app.close()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.debt.deleteMany()
})

describe('POST /api/v1/debts', () => {
  it('crea una deuda y devuelve el monto como string', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)

    expect(response.status).toBe(201)
    expect(response.body.principal).toEqual({ minorUnits: '5634929300', currency: 'CRC' })
    expect(response.body.id).toEqual(expect.any(String))
  })

  it('rechaza una entrada inválida con 400 y el formato de error único', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, termMonths: -3 })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.message).toEqual(expect.any(String))
  })

  it('rechaza con 422 una deuda propia sin cubeta de presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, budgetBucket: null })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('SEMANTIC_VALIDATION_ERROR')
  })

  it('acepta un préstamo otorgado sin cubeta', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, direction: 'LENT', budgetBucket: null, counterparty: 'Andrés' })

    expect(response.status).toBe(201)
    expect(response.body.direction).toBe('LENT')
  })
})

describe('GET /api/v1/debts', () => {
  it('pagina y reporta el total', async () => {
    for (let index = 0; index < 3; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/debts')
        .send({ ...nuevaDeuda, name: `Deuda ${index}` })
    }

    const response = await request(app.getHttpServer()).get('/api/v1/debts?page=1&pageSize=2')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    })
  })

  it('filtra por dirección', async () => {
    await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)
    await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, direction: 'LENT', budgetBucket: null })

    const response = await request(app.getHttpServer()).get('/api/v1/debts?direction=LENT')

    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].direction).toBe('LENT')
  })
})

describe('GET, PATCH y DELETE /api/v1/debts/:id', () => {
  it('devuelve 404 con el formato de error único para un id inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/0199a1c0-0000-7000-8000-00000000ffff',
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('actualiza parcialmente sin exigir el objeto completo', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/debts/${created.body.id}`)
      .send({ name: 'CONAPE reestructurado' })

    expect(response.status).toBe(200)
    expect(response.body.name).toBe('CONAPE reestructurado')
    expect(response.body.termMonths).toBe(120)
  })

  it('borra y luego devuelve 404', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)

    expect((await request(app.getHttpServer()).delete(`/api/v1/debts/${created.body.id}`)).status).toBe(204)
    expect((await request(app.getHttpServer()).get(`/api/v1/debts/${created.body.id}`)).status).toBe(404)
  })
})
```

- [ ] **Paso 7: Correr los tests y confirmar que fallan**

```bash
cd api && npm test -- debts.controller env.spec
```

Esperado: FAIL, `./debts.module.js` y `./env.js` sin resolver.

- [ ] **Paso 8: Esquemas y presentador de deudas**

`api/src/modules/debts/infrastructure/debt.schemas.ts`:

```ts
import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { DEBT_KINDS } from '../domain/debt-kind.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })

export const createDebtSchema = z
  .object({
    name: z.string().trim().min(1),
    counterparty: z.string().trim().min(1),
    principal: moneySchema,
    annualRate: z.string().regex(/^\d+(\.\d+)?$/, { error: 'La tasa debe ser un decimal no negativo' }),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    termMonths: z.number().int().positive(),
    startDate: isoDate,
    kind: z.enum(DEBT_KINDS),
    direction: z.enum(['BORROWED', 'LENT']),
    budgetBucket: z.string().trim().min(1).nullable(),
  })
  .meta({ title: 'CreateDebtInput' })

export const updateDebtSchema = createDebtSchema.partial().meta({ title: 'UpdateDebtInput' })

export const listDebtsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    direction: z.enum(['BORROWED', 'LENT']).optional(),
  })
  .meta({ title: 'ListDebtsQuery' })

export const debtResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    counterparty: z.string(),
    principal: moneySchema,
    annualRate: z.string(),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    termMonths: z.number(),
    startDate: isoDate,
    kind: z.enum(DEBT_KINDS),
    direction: z.enum(['BORROWED', 'LENT']),
    budgetBucket: z.string().nullable(),
    monthlyPayment: moneySchema,
    totalInterest: moneySchema,
    payoffDate: isoDate,
  })
  .meta({ title: 'Debt' })

export type CreateDebtInput = z.infer<typeof createDebtSchema>
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>
export type ListDebtsQuery = z.infer<typeof listDebtsQuerySchema>
export type DebtResponse = z.infer<typeof debtResponseSchema>
```

`api/src/modules/debts/infrastructure/debt.presenter.ts`:

```ts
import { fromMoney } from '../../../shared/http/money.schema.js'
import type { Debt } from '../domain/debt.js'
import type { DebtResponse } from './debt.schemas.js'

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toDebtResponse = (debt: Debt): DebtResponse => {
  const schedule = debt.schedule()
  return {
    id: debt.id,
    name: debt.name,
    counterparty: debt.counterparty,
    principal: fromMoney(debt.principal),
    annualRate: debt.rate.annualPercentage.toString(),
    compounding: debt.rate.compounding,
    termMonths: debt.termMonths,
    startDate: toIsoDate(debt.startDate),
    kind: debt.kind,
    direction: debt.direction,
    budgetBucket: debt.budgetBucket,
    monthlyPayment: fromMoney(schedule.installments[0]?.payment ?? debt.principal.multiply(0)),
    totalInterest: fromMoney(schedule.totalInterest),
    payoffDate: toIsoDate(debt.payoffDate()),
  }
}
```

- [ ] **Paso 9: Casos de uso**

`api/src/modules/debts/application/create-debt.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Decimal } from 'decimal.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import type { CreateDebtInput } from '../infrastructure/debt.schemas.js'

@Injectable()
export class CreateDebtUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(input: CreateDebtInput): Promise<Debt> {
    const rate = InterestRate.create(new Decimal(input.annualRate), input.compounding)
    if (isErr(rate)) throw new SemanticValidationError(rate.error.message)

    const debt = Debt.create({
      id: randomUUID(),
      name: input.name,
      counterparty: input.counterparty,
      principal: toMoney(input.principal),
      rate: rate.value,
      termMonths: input.termMonths,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      kind: input.kind,
      direction: input.direction,
      budgetBucket: input.budgetBucket,
    })
    if (isErr(debt)) throw new SemanticValidationError(debt.error.message)

    await this.debts.save(debt.value)
    return debt.value
  }
}
```

Acá se paga la frontera: el dominio devuelve `Result`, el caso de uso lo traduce a la excepción que el filtro convierte en 422. El dominio nunca supo que existía HTTP.

`api/src/modules/debts/application/get-debt.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class GetDebtUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(id: string): Promise<Debt> {
    const debt = await this.debts.findById(id)
    if (!debt) throw new NotFoundError(`No existe una deuda con el id ${id}`)
    return debt
  }
}
```

`api/src/modules/debts/application/list-debts.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import type { Debt } from '../domain/debt.js'
import type { DebtDirection } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class ListDebtsUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(
    page: number,
    pageSize: number,
    direction?: DebtDirection,
  ): Promise<{ items: Debt[]; totalItems: number }> {
    return this.debts.findAll(page, pageSize, direction)
  }
}
```

`DebtRepository.findAll` ya acepta `direction?: DebtDirection` desde la Tarea 6, y `PrismaDebtRepository` ya lo filtra desde la Tarea 7. Acá solo se usa.

`api/src/modules/debts/application/update-debt.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import type { UpdateDebtInput } from '../infrastructure/debt.schemas.js'

@Injectable()
export class UpdateDebtUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(id: string, input: UpdateDebtInput): Promise<Debt> {
    const current = await this.debts.findById(id)
    if (!current) throw new NotFoundError(`No existe una deuda con el id ${id}`)

    const props = current.toProps()
    const rate =
      input.annualRate === undefined && input.compounding === undefined
        ? props.rate
        : (() => {
            const created = InterestRate.create(
              new Decimal(input.annualRate ?? props.rate.annualPercentage.toString()),
              input.compounding ?? props.rate.compounding,
            )
            if (isErr(created)) throw new SemanticValidationError(created.error.message)
            return created.value
          })()

    const updated = Debt.create({
      ...props,
      name: input.name ?? props.name,
      counterparty: input.counterparty ?? props.counterparty,
      principal: input.principal ? toMoney(input.principal) : props.principal,
      rate,
      termMonths: input.termMonths ?? props.termMonths,
      startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : props.startDate,
      kind: input.kind ?? props.kind,
      direction: input.direction ?? props.direction,
      budgetBucket: input.budgetBucket === undefined ? props.budgetBucket : input.budgetBucket,
    })
    if (isErr(updated)) throw new SemanticValidationError(updated.error.message)

    await this.debts.save(updated.value)
    return updated.value
  }
}
```

`api/src/modules/debts/application/delete-debt.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class DeleteDebtUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.debts.delete(id)
    if (!deleted) throw new NotFoundError(`No existe una deuda con el id ${id}`)
  }
}
```

- [ ] **Paso 10: Controlador y módulo**

`api/src/modules/debts/infrastructure/debts.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { CreateDebtUseCase } from '../application/create-debt.use-case.js'
import { DeleteDebtUseCase } from '../application/delete-debt.use-case.js'
import { GetDebtUseCase } from '../application/get-debt.use-case.js'
import { ListDebtsUseCase } from '../application/list-debts.use-case.js'
import { UpdateDebtUseCase } from '../application/update-debt.use-case.js'
import { toDebtResponse } from './debt.presenter.js'
import {
  createDebtSchema,
  listDebtsQuerySchema,
  updateDebtSchema,
  type CreateDebtInput,
  type DebtResponse,
  type ListDebtsQuery,
  type UpdateDebtInput,
} from './debt.schemas.js'

@Controller('debts')
export class DebtsController {
  constructor(
    private readonly listDebts: ListDebtsUseCase,
    private readonly createDebt: CreateDebtUseCase,
    private readonly getDebt: GetDebtUseCase,
    private readonly updateDebt: UpdateDebtUseCase,
    private readonly deleteDebt: DeleteDebtUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listDebtsQuerySchema)) query: ListDebtsQuery,
  ): Promise<Paginated<DebtResponse>> {
    const { items, totalItems } = await this.listDebts.execute(
      query.page,
      query.pageSize,
      query.direction,
    )
    return paginated(items.map(toDebtResponse), query.page, query.pageSize, totalItems)
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createDebtSchema)) input: CreateDebtInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.createDebt.execute(input))
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<DebtResponse> {
    return toDebtResponse(await this.getDebt.execute(id))
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDebtSchema)) input: UpdateDebtInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.updateDebt.execute(id, input))
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteDebt.execute(id)
  }
}
```

`api/src/modules/debts/debts.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { CreateDebtUseCase } from './application/create-debt.use-case.js'
import { DeleteDebtUseCase } from './application/delete-debt.use-case.js'
import { GetDebtUseCase } from './application/get-debt.use-case.js'
import { ListDebtsUseCase } from './application/list-debts.use-case.js'
import { UpdateDebtUseCase } from './application/update-debt.use-case.js'
import { DEBT_REPOSITORY } from './domain/debt-repository.port.js'
import { DebtsController } from './infrastructure/debts.controller.js'
import { PrismaDebtRepository } from './infrastructure/prisma-debt.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [DebtsController],
  providers: [
    { provide: DEBT_REPOSITORY, useClass: PrismaDebtRepository },
    ListDebtsUseCase,
    CreateDebtUseCase,
    GetDebtUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
  ],
  exports: [DEBT_REPOSITORY],
})
export class DebtsModule {}
```

El puerto se resuelve por `Symbol`: una interfaz de TypeScript no existe en tiempo de ejecución, así que el contenedor necesita un token real.

`api/src/shared/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common'
import { loadEnv } from '../config/env.js'
import { PrismaService } from './prisma.service.js'

@Global()
@Module({
  providers: [{ provide: PrismaService, useFactory: () => new PrismaService(loadEnv(process.env).DATABASE_URL) }],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Paso 11: Arranque de la aplicación**

`api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { DebtsModule } from './modules/debts/debts.module.js'
import { PrismaModule } from './shared/prisma/prisma.module.js'

@Module({ imports: [PrismaModule, DebtsModule] })
export class AppModule {}
```

`api/src/main.ts`:

```ts
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
```

- [ ] **Paso 12: Correr los tests y confirmar que pasan**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

- [ ] **Paso 13: Verificar la API a mano**

```bash
cd api && npm run start:dev
# en otra terminal
curl -s localhost:3000/api/v1/debts | head
curl -s -X POST localhost:3000/api/v1/debts -H 'content-type: application/json' \
  -d '{"name":"CONAPE","counterparty":"CONAPE","principal":{"minorUnits":"5634929300","currency":"CRC"},"annualRate":"9.5","compounding":"MONTHLY","termMonths":120,"startDate":"2026-01-15","kind":"FRENCH","direction":"BORROWED","budgetBucket":"necesidades"}'
```

Esperado: la lista vacía con `pagination`, y la creación devolviendo 201 con el monto como string.

- [ ] **Paso 14: Commit**

```bash
git add api
git commit -m "✨ feat: API de deudas con formato de error único, paginación y validación Zod"
```

**Acceptance criteria:**
- [ ] Una configuración sin `DATABASE_URL` impide arrancar, con el nombre de la variable en el mensaje
- [ ] Los cuatro códigos de error del spec salen con el mismo formato: 400, 404, 409 y 422
- [ ] Un error no previsto devuelve 500 sin filtrar su mensaje interno
- [ ] `GET /debts` pagina y filtra por `direction`
- [ ] `PATCH` acepta un objeto parcial sin exigir el resto de los campos
- [ ] Los montos viajan como string en todas las respuestas

---

### Tarea 9: Amortización, simulación, plan de pago y OpenAPI

**Descripción:** Los tres endpoints que responden las preguntas del spec — la tabla completa, el ahorro de un abono extraordinario y a qué deuda mandar el excedente — más la publicación del OpenAPI, que es de donde el frontend saca sus tipos. Las simulaciones se calculan acá: el cliente no duplica ni un número.

**Alcance:** M · **Dependencias:** Tarea 8

**Files:**
- Create: `api/src/modules/debts/application/get-schedule.use-case.ts`, `simulate-extra-payment.use-case.ts`, `get-payoff-plan.use-case.ts`
- Create: `api/src/modules/debts/infrastructure/schedule.schemas.ts`, `schedule.presenter.ts`
- Modify: `api/src/modules/debts/infrastructure/debts.controller.ts`, `api/src/modules/debts/debts.module.ts`, `api/src/main.ts`
- Test: `api/src/modules/debts/infrastructure/debts-schedule.controller.spec.ts`

**Interfaces:**
- Consumes: `Debt`, `AmortizationSchedule`, `payoffStrategyFor`, `GetDebtUseCase`, `ListDebtsUseCase`
- Produces:
  - `scheduleResponseSchema`, `simulateExtraPaymentSchema`, `projectionResponseSchema`, `payoffPlanResponseSchema`
  - `toScheduleResponse(schedule: AmortizationSchedule)`, `toProjectionResponse(projection: DebtProjection)`
  - `GetScheduleUseCase.execute(id)`, `SimulateExtraPaymentUseCase.execute(id, input)`, `GetPayoffPlanUseCase.execute(strategy, orderedIds)`
  - `GET /api/v1/openapi.json`

- [ ] **Paso 1: Escribir el test que falla**

`api/src/modules/debts/infrastructure/debts-schedule.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../../test/postgres-container.js'
import { DebtsModule } from '../debts.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

// Capital ₡100.000, 12 % nominal mensual, 3 cuotas: la misma tabla que valida el dominio.
const tresCuotas = {
  name: 'Préstamo corto',
  counterparty: 'Banco',
  principal: { minorUnits: '10000000', currency: 'CRC' },
  annualRate: '12',
  compounding: 'MONTHLY',
  termMonths: 3,
  startDate: '2026-01-15',
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
}

const crear = (overrides: Record<string, unknown> = {}) =>
  request(app.getHttpServer()).post('/api/v1/debts').send({ ...tresCuotas, ...overrides })

beforeAll(async () => {
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [DebtsModule] })
    .overrideProvider(PrismaService)
    .useValue(new PrismaService(postgres.url))
    .compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()
  prisma = app.get(PrismaService)
}, 180_000)

afterAll(async () => {
  await app.close()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.debt.deleteMany()
})

describe('GET /api/v1/debts/:id/schedule', () => {
  it('devuelve la tabla completa con el mismo desglose que el dominio', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer()).get(
      `/api/v1/debts/${created.body.id}/schedule`,
    )

    expect(response.status).toBe(200)
    expect(response.body.installments).toHaveLength(3)
    expect(response.body.installments[0]).toMatchObject({
      number: 1,
      dueDate: '2026-02-15',
      payment: { minorUnits: '3400221', currency: 'CRC' },
      interest: { minorUnits: '100000', currency: 'CRC' },
      principal: { minorUnits: '3300221', currency: 'CRC' },
      balance: { minorUnits: '6699779', currency: 'CRC' },
    })
  })

  it('la última cuota absorbe el residuo y deja el saldo en cero', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer()).get(
      `/api/v1/debts/${created.body.id}/schedule`,
    )

    expect(response.body.installments[2].payment.minorUnits).toBe('3400222')
    expect(response.body.installments[2].balance.minorUnits).toBe('0')
    expect(response.body.totalInterest.minorUnits).toBe('200664')
  })

  it('devuelve 404 para una deuda inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/0199a1c0-0000-7000-8000-00000000ffff/schedule',
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})

describe('POST /api/v1/debts/:id/simulate', () => {
  it('reporta el interés ahorrado y los meses ganados', async () => {
    const created = await crear({ termMonths: 12 })
    const response = await request(app.getHttpServer())
      .post(`/api/v1/debts/${created.body.id}/simulate`)
      .send({
        amount: { minorUnits: '3000000', currency: 'CRC' },
        afterInstallment: 1,
        mode: 'REDUCE_TERM',
      })

    expect(response.status).toBe(200)
    expect(Number(response.body.interestSaved.minorUnits)).toBeGreaterThan(0)
    expect(response.body.monthsSaved).toBeGreaterThan(0)
    expect(response.body.withExtraPayment.installments.length).toBeLessThan(
      response.body.baseline.installments.length,
    )
  })

  it('rechaza con 422 un abono posterior a la última cuota', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer())
      .post(`/api/v1/debts/${created.body.id}/simulate`)
      .send({
        amount: { minorUnits: '100000', currency: 'CRC' },
        afterInstallment: 9,
        mode: 'REDUCE_TERM',
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('SEMANTIC_VALIDATION_ERROR')
  })

  it('rechaza con 400 un cuerpo sin monto', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer())
      .post(`/api/v1/debts/${created.body.id}/simulate`)
      .send({ afterInstallment: 1, mode: 'REDUCE_TERM' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/v1/debts/payoff-plan', () => {
  it('ordena por tasa descendente con avalancha', async () => {
    await crear({ name: 'Barata', annualRate: '9' })
    await crear({ name: 'Cara', annualRate: '42' })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=avalanche',
    )

    expect(response.status).toBe(200)
    expect(response.body.strategy).toBe('avalanche')
    expect(response.body.order.map((d: { name: string }) => d.name)).toEqual(['Cara', 'Barata'])
  })

  it('ordena por saldo ascendente con bola de nieve', async () => {
    await crear({ name: 'Grande', principal: { minorUnits: '50000000', currency: 'CRC' } })
    await crear({ name: 'Chica', principal: { minorUnits: '1000000', currency: 'CRC' } })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=snowball',
    )

    expect(response.body.order.map((d: { name: string }) => d.name)).toEqual(['Chica', 'Grande'])
  })

  it('deja fuera los préstamos otorgados', async () => {
    await crear({ name: 'Propia' })
    await crear({ name: 'Prestada', direction: 'LENT', budgetBucket: null })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=avalanche',
    )

    expect(response.body.order.map((d: { name: string }) => d.name)).toEqual(['Propia'])
  })

  it('rechaza con 400 una estrategia desconocida', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=magia',
    )
    expect(response.status).toBe(400)
  })
})
```

`payoff-plan` va declarado **antes** que `:id` en el controlador. Si `:id` viniera primero, Nest resolvería `/debts/payoff-plan` como una deuda con id `payoff-plan` y el endpoint devolvería 404.

- [ ] **Paso 2: Correr el test y confirmar que falla**

```bash
cd api && npm test -- debts-schedule
```

Esperado: FAIL con 404 en los tres endpoints nuevos.

- [ ] **Paso 3: Esquemas y presentadores de la tabla**

`api/src/modules/debts/infrastructure/schedule.schemas.ts`:

```ts
import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'

export const installmentSchema = z
  .object({
    number: z.number().int().positive(),
    dueDate: z.string(),
    payment: moneySchema,
    principal: moneySchema,
    interest: moneySchema,
    balance: moneySchema,
  })
  .meta({ title: 'Installment' })

export const scheduleResponseSchema = z
  .object({
    installments: z.array(installmentSchema),
    totalInterest: moneySchema,
    totalPaid: moneySchema,
  })
  .meta({ title: 'AmortizationSchedule' })

export const simulateExtraPaymentSchema = z
  .object({
    amount: moneySchema,
    afterInstallment: z.number().int().positive(),
    mode: z.enum(['REDUCE_TERM', 'REDUCE_PAYMENT']),
  })
  .meta({ title: 'SimulateExtraPaymentInput' })

export const projectionResponseSchema = z
  .object({
    baseline: scheduleResponseSchema,
    withExtraPayment: scheduleResponseSchema,
    extraPayment: moneySchema,
    interestSaved: moneySchema,
    monthsSaved: z.number().int(),
    totalPaidWithExtra: moneySchema,
  })
  .meta({ title: 'ExtraPaymentProjection' })

export const payoffPlanQuerySchema = z
  .object({
    strategy: z.enum(['avalanche', 'snowball', 'manual']).default('avalanche'),
    order: z.string().optional(),
  })
  .meta({ title: 'PayoffPlanQuery' })

export const payoffPlanResponseSchema = z
  .object({
    strategy: z.enum(['avalanche', 'snowball', 'manual']),
    order: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        balance: moneySchema,
        annualRate: z.string(),
        monthlyPayment: moneySchema,
      }),
    ),
  })
  .meta({ title: 'PayoffPlan' })

export type SimulateExtraPaymentInput = z.infer<typeof simulateExtraPaymentSchema>
export type PayoffPlanQuery = z.infer<typeof payoffPlanQuerySchema>
export type ScheduleResponse = z.infer<typeof scheduleResponseSchema>
export type ProjectionResponse = z.infer<typeof projectionResponseSchema>
export type PayoffPlanResponse = z.infer<typeof payoffPlanResponseSchema>
```

`api/src/modules/debts/infrastructure/schedule.presenter.ts`:

```ts
import { fromMoney } from '../../../shared/http/money.schema.js'
import type { AmortizationSchedule } from '../domain/amortization.js'
import type { DebtProjection } from '../domain/extra-payment.js'
import type { ProjectionResponse, ScheduleResponse } from './schedule.schemas.js'

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toScheduleResponse = (schedule: AmortizationSchedule): ScheduleResponse => ({
  installments: schedule.installments.map((installment) => ({
    number: installment.number,
    dueDate: toIsoDate(installment.dueDate),
    payment: fromMoney(installment.payment),
    principal: fromMoney(installment.principal),
    interest: fromMoney(installment.interest),
    balance: fromMoney(installment.balance),
  })),
  totalInterest: fromMoney(schedule.totalInterest),
  totalPaid: fromMoney(schedule.totalPaid),
})

export const toProjectionResponse = (projection: DebtProjection): ProjectionResponse => ({
  baseline: toScheduleResponse(projection.baseline),
  withExtraPayment: toScheduleResponse(projection.withExtraPayment),
  extraPayment: fromMoney(projection.extraPayment),
  interestSaved: fromMoney(projection.interestSaved),
  monthsSaved: projection.monthsSaved,
  totalPaidWithExtra: fromMoney(projection.totalPaidWithExtra),
})
```

- [ ] **Paso 4: Casos de uso**

`api/src/modules/debts/application/get-schedule.use-case.ts`:

```ts
import { Injectable } from '@nestjs/common'
import type { AmortizationSchedule } from '../domain/amortization.js'
import { GetDebtUseCase } from './get-debt.use-case.js'

@Injectable()
export class GetScheduleUseCase {
  constructor(private readonly getDebt: GetDebtUseCase) {}

  async execute(id: string): Promise<AmortizationSchedule> {
    return (await this.getDebt.execute(id)).schedule()
  }
}
```

`api/src/modules/debts/application/simulate-extra-payment.use-case.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { isErr } from '../../../shared/kernel/result.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import type { DebtProjection } from '../domain/extra-payment.js'
import type { SimulateExtraPaymentInput } from '../infrastructure/schedule.schemas.js'
import { GetDebtUseCase } from './get-debt.use-case.js'

@Injectable()
export class SimulateExtraPaymentUseCase {
  constructor(private readonly getDebt: GetDebtUseCase) {}

  async execute(id: string, input: SimulateExtraPaymentInput): Promise<DebtProjection> {
    const debt = await this.getDebt.execute(id)
    const projection = debt.applyExtraPayment({
      amount: toMoney(input.amount),
      afterInstallment: input.afterInstallment,
      mode: input.mode,
    })
    if (isErr(projection)) throw new SemanticValidationError(projection.error.message)
    return projection.value
  }
}
```

`api/src/modules/debts/application/get-payoff-plan.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import { payoffStrategyFor, type PayoffStrategyId } from '../domain/payoff-strategy.js'

const ALL = 1000

@Injectable()
export class GetPayoffPlanUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(strategy: PayoffStrategyId, orderedIds: readonly string[], at = new Date()): Promise<Debt[]> {
    const { items } = await this.debts.findAll(1, ALL, 'BORROWED')
    return payoffStrategyFor(strategy, orderedIds).order(items, at)
  }
}
```

- [ ] **Paso 5: Ampliar el controlador**

Agregar a `api/src/modules/debts/infrastructure/debts.controller.ts`, **antes** del método `get(':id')`:

```ts
  @Get('payoff-plan')
  async payoffPlan(
    @Query(new ZodValidationPipe(payoffPlanQuerySchema)) query: PayoffPlanQuery,
  ): Promise<PayoffPlanResponse> {
    const orderedIds = query.order ? query.order.split(',') : []
    const debts = await this.getPayoffPlan.execute(query.strategy, orderedIds)
    return {
      strategy: query.strategy,
      order: debts.map((debt) => ({
        id: debt.id,
        name: debt.name,
        balance: fromMoney(debt.balanceAt(new Date())),
        annualRate: debt.rate.annualPercentage.toString(),
        monthlyPayment: fromMoney(
          debt.schedule().installments[0]?.payment ?? debt.principal.multiply(0),
        ),
      })),
    }
  }
```

y después de `get(':id')`:

```ts
  @Get(':id/schedule')
  async schedule(@Param('id') id: string): Promise<ScheduleResponse> {
    return toScheduleResponse(await this.getSchedule.execute(id))
  }

  @Post(':id/simulate')
  @HttpCode(200)
  async simulate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(simulateExtraPaymentSchema)) input: SimulateExtraPaymentInput,
  ): Promise<ProjectionResponse> {
    return toProjectionResponse(await this.simulateExtraPayment.execute(id, input))
  }
```

Sumar al constructor `private readonly getSchedule: GetScheduleUseCase`, `private readonly simulateExtraPayment: SimulateExtraPaymentUseCase` y `private readonly getPayoffPlan: GetPayoffPlanUseCase`, registrar los tres casos de uso en `debts.module.ts`, e importar `fromMoney`, los esquemas y los presentadores nuevos.

`POST /simulate` responde 200, no 201: simular no crea nada.

- [ ] **Paso 6: Publicar el OpenAPI**

```bash
cd api && npm install zod-openapi@5.5.0
```

Agregar a `api/src/main.ts`, antes de `app.listen`:

```ts
import { createDocument } from 'zod-openapi'
import { debtsOpenApiPaths } from './modules/debts/infrastructure/debts.openapi.js'

  const openapi = createDocument({
    openapi: '3.1.0',
    info: { title: 'Finanzas API', version: '1.0.0' },
    servers: [{ url: '/api/v1' }],
    paths: debtsOpenApiPaths,
  })
  app.getHttpAdapter().get('/api/v1/openapi.json', (_req, res) => res.json(openapi))
```

`api/src/modules/debts/infrastructure/debts.openapi.ts` declara cada ruta reutilizando los mismos esquemas Zod ya definidos — `createDebtSchema`, `debtResponseSchema`, `scheduleResponseSchema`, `simulateExtraPaymentSchema`, `projectionResponseSchema`, `payoffPlanResponseSchema` — como `requestBody` y `responses`. Ningún esquema se redefine: el contrato tiene una sola fuente y el `title` de cada `meta` es lo que nombra los tipos generados.

- [ ] **Paso 7: Correr todo y verificar el OpenAPI**

```bash
cd api && npm test && npm run typecheck && npm run lint
npm run start:dev
# en otra terminal
curl -s localhost:3000/api/v1/openapi.json | head -40
```

Esperado: el documento incluye los componentes `Debt`, `Money`, `AmortizationSchedule` y `ExtraPaymentProjection` con esos nombres.

- [ ] **Paso 8: Commit**

```bash
git add api
git commit -m "✨ feat: tabla de amortización, simulador de abono, plan de pago y OpenAPI"
```

**Acceptance criteria:**
- [ ] `GET /debts/:id/schedule` devuelve la tabla de referencia con la última cuota en 3.400.222 y saldo 0
- [ ] `POST /debts/:id/simulate` reporta interés ahorrado y meses ganados, y responde 200
- [ ] `GET /debts/payoff-plan` está declarado antes de `:id` y no se resuelve como una deuda
- [ ] El plan de pago excluye los préstamos otorgados
- [ ] `/api/v1/openapi.json` expone los componentes con `title` propio

---

### Checkpoint: API completa (tras las Tareas 7–9)

- [ ] `cd api && npm test` → dominio, persistencia y HTTP en verde
- [ ] `curl localhost:3000/api/v1/debts` responde con `data` y `pagination`
- [ ] El OpenAPI lista todos los endpoints de deudas
- [ ] Revisión con Emilio antes de empezar el frontend

---

### Tarea 10: Fundación del frontend y sistema de diseño

**Descripción:** Levantar `web/` con Vite, React, TanStack Router y Query, Tailwind 4 y shadcn, y —antes de pintar una sola pantalla— fijar el sistema de diseño en `PRODUCT.md` y `DESIGN.md`. Sin ese paso, shadcn sale con sus grises por defecto y la app termina siendo indistinguible de cualquier plantilla.

**Alcance:** L · **Dependencias:** Tarea 9

**Files:**
- Create: `PRODUCT.md`, `DESIGN.md` (raíz del repositorio)
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`, `web/components.json`
- Create: `web/src/main.tsx`, `web/src/styles.css`, `web/src/router.tsx`
- Create: `web/src/routes/__root.tsx`, `web/src/routes/index.tsx`
- Create: `web/src/lib/api.ts`, `web/src/lib/money.ts`, `web/src/lib/query-keys.ts`
- Create: `web/scripts/generate-api-types.mjs`
- Test: `web/src/lib/money.spec.ts`

**Interfaces:**
- Consumes: `/api/v1/openapi.json` de la API
- Produces:
  - `web/src/lib/api-types.gen.ts` — tipos generados, nunca escritos a mano
  - `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` con el formato de error del backend tipado
  - `formatMoney(money: MoneyDto, locale?: string): string`, `parseMoneyInput(text: string, currency: CurrencyCode): MoneyDto`
  - `queryKeys.debts.list(params)`, `queryKeys.debts.detail(id)`, `queryKeys.debts.schedule(id)`, `queryKeys.debts.payoffPlan(strategy)`
  - `router` con `context: { queryClient }`

- [ ] **Paso 1: Fijar el contexto de diseño antes de tocar código**

Cargar las skills obligatorias y sus `reference/`: `frontend-design`, `impeccable`, `emil-design-eng`, `accessibility`, `color-contrast`, `mobile-responsiveness`.

**`PRODUCT.md` y `DESIGN.md` ya existen en la raíz.** La sesión de `impeccable teach` se hizo el 2026-09-20; este paso ya no es una entrevista, es leerlos y resolver lo que quedó marcado como pendiente.

Leer los dos archivos completos antes de escribir una línea de interfaz. Lo que traen ya decidido:

| Decisión | Valor |
|---|---|
| Registro | `product` |
| Norte creativo | «La cinta de la sumadora» |
| Personalidad | Denso, directo, verificable |
| Color | **Sin acento cromático.** El color es semántico o no está. La jerarquía es luminancia, peso y espacio |
| Neutros | Tinte **cálido** (matiz OKLCH 60–80, croma 0,005–0,01). Nunca `#000` ni `#fff` |
| Tema | Oscuro por defecto, claro completo |
| Tipografía | Sans técnica compacta para interfaz, **mono para toda cifra**, con `tabular-nums` |
| Densidad | Gana sobre el aire. La unidad es la fila, no la tarjeta |
| Elevación | Plana en reposo. Profundidad por tono, no por sombra |
| Movimiento | Cambios de estado, transiciones y feedback. Sin coreografía. Curvas exponenciales de salida |
| Accesibilidad | WCAG AA en los dos temas · nada depende solo del color · texto escalable al 200 % |

**Lo que este paso tiene que resolver**, que es lo único que `DESIGN.md` deja marcado como pendiente:

1. Los valores OKLCH exactos de la escala neutra completa en los dos temas: fondo, superficie, superficie elevada, borde sutil, borde, texto atenuado, texto secundario, texto principal.
2. Los tres colores semánticos —negativo, positivo, advertencia— verificados a 4,5:1 sobre cada superficie de cada tema con la skill `color-contrast`.
3. Las dos familias tipográficas concretas. Prohibidas Inter, Roboto, Arial y las del sistema. La mono tiene que distinguir `1101` de `1l01` sin esfuerzo.

Resueltos los tres, **escribirlos de vuelta en `DESIGN.md`** reemplazando los marcadores `[a resolver durante la implementación]`, y recién ahí seguir. Al terminar la rebanada, correr `impeccable document` otra vez para que capture los tokens y componentes reales.

Las reglas con nombre de `DESIGN.md` son vinculantes y se verifican en la puerta de calidad: la del Monocromo, la del Signo, la de la Cifra Tabular, la del Código, la del Tono sobre la Sombra y la del Gráfico.

- [ ] **Paso 2: Crear el proyecto**

```bash
cd finanzas
npm create vite@latest web -- --template react-ts
cd web
npm install
npm install @tanstack/react-router@1.170.38 @tanstack/react-query@5.103.1 sonner@2.0.8
npm install -D @tanstack/router-plugin@1.168.40 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 openapi-typescript@7.13.0 vitest@5.0.1 typescript@6.0.3
```

`web/package.json` — scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "api:types": "node scripts/generate-api-types.mjs"
  }
}
```

- [ ] **Paso 3: Configurar Vite**

`web/vite.config.ts`:

```ts
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
```

`tanstackRouter()` va **antes** que `react()`. Al revés, la generación del árbol de rutas y el code splitting fallan en silencio: no hay error, simplemente no funcionan.

- [ ] **Paso 4: Tailwind 4 y shadcn con los tokens de `DESIGN.md`**

`web/src/styles.css`:

```css
@import "tailwindcss";
```

```bash
cd web && npx shadcn@latest init
npx shadcn@latest add button card table input select dialog skeleton sonner badge tabs form label chart
```

Terminado el init, **reemplazar** los tokens que shadcn deja por defecto por los valores OKLCH de `DESIGN.md`, en `:root` y en el bloque de tema oscuro. Los grises por defecto de shadcn son el punto de partida, no el resultado.

- [ ] **Paso 5: Generar los tipos desde el OpenAPI**

`web/scripts/generate-api-types.mjs`:

```js
import { execFileSync } from 'node:child_process'

const source = process.env.OPENAPI_URL ?? 'http://localhost:3000/api/v1/openapi.json'

execFileSync('npx', ['openapi-typescript', source, '-o', 'src/lib/api-types.gen.ts'], {
  stdio: 'inherit',
})
```

```bash
# con la API corriendo
cd web && npm run api:types
```

`src/lib/api-types.gen.ts` se regenera, nunca se edita a mano. Agregarlo a `.gitignore` sería un error: se versiona, para que un `git diff` muestre cuándo cambió el contrato.

- [ ] **Paso 6: Escribir el test de formateo que falla**

`web/src/lib/money.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoneyInput } from './money.js'

describe('formatMoney', () => {
  it('formatea colones con separadores de miles y sin decimales sobrantes', () => {
    expect(formatMoney({ minorUnits: '5634929300', currency: 'CRC' })).toBe('₡56 349 293,00')
  })

  it('formatea dólares', () => {
    expect(formatMoney({ minorUnits: '150000', currency: 'USD' })).toBe('$1500,00')
  })

  it('formatea cero y negativos sin romper', () => {
    expect(formatMoney({ minorUnits: '0', currency: 'CRC' })).toContain('0')
    expect(formatMoney({ minorUnits: '-2500', currency: 'CRC' })).toContain('-')
  })

  it('no pierde precisión en montos que desbordan el entero seguro de JavaScript', () => {
    expect(formatMoney({ minorUnits: '900719925474099100', currency: 'CRC' })).toContain(
      '9 007 199 254 740 991',
    )
  })
})

describe('parseMoneyInput', () => {
  it('convierte lo que el usuario escribe a unidades mínimas', () => {
    expect(parseMoneyInput('56 349 293,00', 'CRC')).toEqual({
      minorUnits: '5634929300',
      currency: 'CRC',
    })
  })

  it('tolera la ausencia de decimales', () => {
    expect(parseMoneyInput('1000', 'CRC')).toEqual({ minorUnits: '100000', currency: 'CRC' })
  })

  it('rechaza texto que no es un monto', () => {
    expect(() => parseMoneyInput('mucha plata', 'CRC')).toThrow(RangeError)
  })
})
```

El caso que desborda el entero seguro no es decorativo: si el formateo pasa por `Number`, ese test falla. Los montos se formatean desde `bigint`, punto.

- [ ] **Paso 7: Implementar el formateo de montos**

`web/src/lib/money.ts`:

```ts
export type CurrencyCode = 'CRC' | 'USD'

export interface MoneyDto {
  minorUnits: string
  currency: CurrencyCode
}

const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = { CRC: 2, USD: 2 }
const SYMBOL: Record<CurrencyCode, string> = { CRC: '₡', USD: '$' }
const NARROW_SPACE = ' '

// El formateo nunca pasa por Number: un monto en céntimos desborda el entero seguro.
export const formatMoney = (money: MoneyDto): string => {
  const exponent = MINOR_UNIT_EXPONENT[money.currency]
  const negative = money.minorUnits.startsWith('-')
  const digits = (negative ? money.minorUnits.slice(1) : money.minorUnits).padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent)
  const fraction = digits.slice(digits.length - exponent)
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_SPACE)
  return `${negative ? '-' : ''}${SYMBOL[money.currency]}${grouped},${fraction}`
}

export const parseMoneyInput = (text: string, currency: CurrencyCode): MoneyDto => {
  const cleaned = text.replace(/[\s .]/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new RangeError(`No se pudo leer «${text}» como un monto`)
  }
  const [whole = '0', fraction = ''] = cleaned.split('.')
  const exponent = MINOR_UNIT_EXPONENT[currency]
  const negative = whole.startsWith('-')
  const absWhole = negative ? whole.slice(1) : whole
  const minor = `${absWhole}${fraction.padEnd(exponent, '0')}`.replace(/^0+(?=\d)/, '')
  return { minorUnits: `${negative ? '-' : ''}${minor}`, currency }
}
```

- [ ] **Paso 8: Cliente HTTP con el formato de error del backend**

`web/src/lib/api.ts`:

```ts
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof (value as ApiErrorBody).error?.message === 'string'

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      throw new ApiError(response.status, payload.error.code, payload.error.message, payload.error.details)
    }
    // Un fallo de red o una respuesta ilegible tampoco puede quedar sin mensaje para el toast.
    throw new ApiError(response.status, 'UNKNOWN_ERROR', 'No se pudo completar la operación')
  }

  return payload as T
}
```

`web/src/lib/query-keys.ts`:

```ts
export const queryKeys = {
  debts: {
    all: ['debts'] as const,
    list: (params: { page: number; pageSize: number; direction?: string }) =>
      ['debts', 'list', params] as const,
    detail: (id: string) => ['debts', 'detail', id] as const,
    schedule: (id: string) => ['debts', 'schedule', id] as const,
    payoffPlan: (strategy: string) => ['debts', 'payoff-plan', strategy] as const,
  },
}
```

- [ ] **Paso 9: Router con el `queryClient` en contexto y toasts globales**

`web/src/router.tsx`:

```tsx
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

`defaultPreloadStaleTime: 0` deja que TanStack Query gobierne el caché en lugar del router, que es lo que pide el spec.

`web/src/routes/__root.tsx`:

```tsx
import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <Outlet />
      <Toaster position="bottom-right" />
    </>
  ),
})
```

`web/src/main.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient, router } from './router'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('Falta el contenedor #root en index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Paso 10: Errores globales con toast**

Agregar al `QueryClient` de `web/src/router.tsx`:

```tsx
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from './lib/api'

const describe = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'No se pudo completar la operación'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  queryCache: new QueryCache({ onError: (error) => toast.error(describe(error)) }),
  mutationCache: new MutationCache({ onError: (error) => toast.error(describe(error)) }),
})
```

Un `QueryCache` y un `MutationCache` con `onError` cubren el 100 % de los errores de una sola vez, sin que cada pantalla tenga que acordarse. Es la única forma de que la regla F5 se cumpla por construcción y no por disciplina.

- [ ] **Paso 11: Verificar**

```bash
cd web && npm test && npm run typecheck && npm run build
npm run dev
```

Verificar a mano, con las herramientas de desarrollo del navegador:

- [ ] La app carga sin errores en consola
- [ ] Apagando la API, cualquier navegación dispara un toast de error, no una pantalla en blanco
- [ ] A 360 px no hay desplazamiento horizontal
- [ ] Los colores salen de `DESIGN.md`, no de los tokens por defecto de shadcn
- [ ] El contraste de texto llega a 4,5:1 y el de los controles a 3:1, **en los dos temas** (skill `color-contrast`)
- [ ] El interruptor de tema cambia entre oscuro y claro, y la preferencia sobrevive a recargar la página

- [ ] **Paso 12: Commit**

```bash
git add PRODUCT.md DESIGN.md web
git commit -m "🏗️ build: frontend con Vite, TanStack, Tailwind 4, shadcn y sistema de diseño"
```

**Acceptance criteria:**
- [ ] `PRODUCT.md` y `DESIGN.md` existen y los tokens de shadcn salen de ahí
- [ ] Los dos temas están completos y cumplen contraste; el oscuro es el que abre
- [ ] No hay ni un token dorado, ámbar, mostaza o bronce en `DESIGN.md`
- [ ] `tanstackRouter()` está declarado antes que `react()` en `vite.config.ts`
- [ ] Los tipos de la API están generados desde el OpenAPI, no escritos a mano
- [ ] Un monto de 18 dígitos se formatea sin perder precisión
- [ ] Todo error de query o mutación produce un toast, sin código por pantalla

---

### Tarea 11: Pantallas de deudas y préstamos

**Descripción:** La rebanada se cierra acá: Emilio carga una deuda, ve su tabla de amortización, simula un abono y consulta a cuál mandar el excedente. Dos listas separadas —lo que debe y lo que le deben— porque son dos preguntas distintas aunque compartan el modelo.

**Alcance:** L · **Dependencias:** Tarea 10

**Files:**
- Create: `web/src/routes/deudas.tsx`, `web/src/routes/deudas.index.tsx`, `web/src/routes/deudas.$debtId.tsx`, `web/src/routes/plan-de-pago.tsx`
- Create: `web/src/features/debts/use-debts.ts`, `debt-form.tsx`, `debt-list.tsx`, `amortization-table.tsx`, `extra-payment-simulator.tsx`, `balance-chart.tsx`, `empty-state.tsx`
- Modify: `web/src/routes/__root.tsx` (navegación)
- Test: `web/src/features/debts/amortization-table.spec.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `queryKeys`, `formatMoney`, `parseMoneyInput`, tipos de `api-types.gen.ts`
- Produces:
  - `useDebts(params)`, `useDebt(id)`, `useSchedule(id)`, `usePayoffPlan(strategy)`, `useCreateDebt()`, `useUpdateDebt()`, `useDeleteDebt()`, `useSimulateExtraPayment(id)`
  - `<DebtList direction>`, `<DebtForm mode debt?>`, `<AmortizationTable installments>`, `<ExtraPaymentSimulator debtId>`, `<BalanceChart installments>`, `<EmptyState title description action?>`

- [ ] **Paso 1: Copy antes que componentes**

Invocar la skill `copywriting` y producir con ella **todo** el texto de esta tarea, antes de escribir JSX. Como mínimo: los dos títulos de pestaña, el estado vacío de cada lista, las etiquetas y textos de ayuda del formulario, los encabezados de la tabla, el texto del simulador y sus resultados, y los mensajes de error y de éxito de cada mutación.

El copy queda en `web/src/features/debts/copy.ts` como un objeto de constantes, no disperso en el JSX. Así se revisa de una sola lectura con `copy-editing` cuando haga falta.

Regla del copy: nada de rayas largas, y ninguna palabra que solo repita el título que tiene encima.

- [ ] **Paso 2: Hooks de datos**

`web/src/features/debts/use-debts.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type { Debt, DebtInput, PayoffPlan, Schedule, Projection, Paginated } from './types'

export const useDebts = (direction: 'BORROWED' | 'LENT', page = 1, pageSize = 20) =>
  useQuery({
    queryKey: queryKeys.debts.list({ page, pageSize, direction }),
    queryFn: () =>
      apiFetch<Paginated<Debt>>(`/debts?page=${page}&pageSize=${pageSize}&direction=${direction}`),
  })

export const useDebt = (id: string) =>
  useQuery({ queryKey: queryKeys.debts.detail(id), queryFn: () => apiFetch<Debt>(`/debts/${id}`) })

export const useSchedule = (id: string) =>
  useQuery({
    queryKey: queryKeys.debts.schedule(id),
    queryFn: () => apiFetch<Schedule>(`/debts/${id}/schedule`),
  })

export const usePayoffPlan = (strategy: 'avalanche' | 'snowball') =>
  useQuery({
    queryKey: queryKeys.debts.payoffPlan(strategy),
    queryFn: () => apiFetch<PayoffPlan>(`/debts/payoff-plan?strategy=${strategy}`),
  })

export const useCreateDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DebtInput) =>
      apiFetch<Debt>('/debts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.toast.created)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useUpdateDebt = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<DebtInput>) =>
      apiFetch<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.toast.updated)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useDeleteDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/debts/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(copy.toast.deleted)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useSimulateExtraPayment = (id: string) =>
  useMutation({
    mutationFn: (input: { amount: { minorUnits: string; currency: 'CRC' | 'USD' }; afterInstallment: number; mode: 'REDUCE_TERM' | 'REDUCE_PAYMENT' }) =>
      apiFetch<Projection>(`/debts/${id}/simulate`, { method: 'POST', body: JSON.stringify(input) }),
  })
```

Ningún hook trae `onError`: el `QueryCache` y el `MutationCache` de la Tarea 10 ya cubren el 100 % de los errores con un toast. Repetirlo acá sería duplicar el toast, no reforzarlo.

`web/src/features/debts/types.ts` reexporta desde `api-types.gen.ts` los alias que el módulo usa. Ningún tipo de respuesta se declara a mano.

- [ ] **Paso 3: Escribir el test de la tabla que falla**

```bash
cd web && npm install -D @testing-library/react@17.0.2 @testing-library/jest-dom@7.0.2 jsdom@28.0.1
```

Agregar a `web/vitest.config.ts` (o al bloque `test` de `vite.config.ts`): `environment: 'jsdom'`, `setupFiles: ['./src/test-setup.ts']`, con `import '@testing-library/jest-dom/vitest'` dentro.

`web/src/features/debts/amortization-table.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AmortizationTable } from './amortization-table'

const crc = (minorUnits: string) => ({ minorUnits, currency: 'CRC' as const })

const installments = [
  { number: 1, dueDate: '2026-02-15', payment: crc('3400221'), principal: crc('3300221'), interest: crc('100000'), balance: crc('6699779') },
  { number: 2, dueDate: '2026-03-15', payment: crc('3400221'), principal: crc('3333223'), interest: crc('66998'), balance: crc('3366556') },
  { number: 3, dueDate: '2026-04-15', payment: crc('3400222'), principal: crc('3366556'), interest: crc('33666'), balance: crc('0') },
]

describe('AmortizationTable', () => {
  it('muestra una fila por cuota con el monto formateado', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.getAllByRole('row')).toHaveLength(installments.length + 1)
    expect(screen.getByText(/3 400 221/)).toBeInTheDocument()
  })

  it('marca la última cuota, que es la que absorbe el residuo', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.getByText(/3 400 222/)).toBeInTheDocument()
  })

  it('expone la tabla con encabezados accesibles', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
  })

  it('no rompe con una tabla vacía', () => {
    render(<AmortizationTable installments={[]} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
```

- [ ] **Paso 4: Tabla de amortización, responsive de verdad**

`web/src/features/debts/amortization-table.tsx` rinde **dos estructuras**, no una tabla con desplazamiento horizontal:

- A partir de 768 px: `<Table>` de shadcn, con `<caption>` que describe el contenido, `scope="col"` en cada encabezado y alineación a la derecha en las columnas numéricas.
- Por debajo de 768 px: una lista donde cada cuota es una fila con su número y fecha arriba y el desglose en pares etiqueta/valor. Sin tarjeta envolvente: separadores, que la tarjeta es la respuesta perezosa.

Ambas ramas salen del mismo arreglo de datos; se alternan con las utilidades responsivas de Tailwind, no con JavaScript midiendo el ancho. Una tabla de 120 cuotas dentro de un contenedor con `overflow-x` en un teléfono es exactamente lo que la regla F3 prohíbe.

- [ ] **Paso 5: Gráfico de saldo con el componente `chart` de shadcn**

`web/src/features/debts/balance-chart.tsx` usa `ChartContainer`, `ChartTooltip` y `ChartTooltipContent` de `@/components/ui/chart`. Nunca se importa nada de `recharts` directamente: shadcn lo envuelve y es ese envoltorio el que aporta los tokens del tema y el tooltip accesible.

- Una sola serie: el saldo a lo largo del tiempo.
- Los colores salen de las variables `--chart-*` de `DESIGN.md`, no de literales.
- El gráfico va acompañado de la tabla, nunca solo: quien no puede leer el gráfico tiene el dato exacto al lado.
- `aria-label` con una frase que resuma la curva.

- [ ] **Paso 6: Simulador de abono**

`web/src/features/debts/extra-payment-simulator.tsx`:

- Entradas: monto, después de cuál cuota, y el modo (acortar plazo o bajar cuota) como `RadioGroup`, no como `Select`: son dos opciones y ambas deben verse sin abrir nada.
- El resultado aparece **en la misma pantalla**, debajo del formulario. No en un modal. El modal como primera respuesta está prohibido, y acá además obligaría a cerrarlo para cambiar un número y volver a abrirlo.
- Muestra interés ahorrado, meses ganados y la fecha nueva de finalización, comparados contra el escenario base.
- Mientras la mutación corre, el bloque de resultados muestra `Skeleton`. Si falla, el toast global ya avisa y el bloque vuelve a su estado anterior.

- [ ] **Paso 7: Listas, formulario y estados vacíos**

`web/src/routes/deudas.tsx` monta las dos pestañas con `Tabs` de shadcn. Cada pestaña usa `<DebtList direction>`.

Tres estados por lista, los tres obligatorios:

| Estado | Qué se muestra |
|---|---|
| Cargando | `Skeleton` con la forma de la lista, no un spinner centrado |
| Vacío | `<EmptyState>` con el copy de `copywriting` y el botón que lleva a crear la primera |
| Con datos | Filas con nombre, contraparte, saldo, cuota y fecha de finalización |

`debt-form.tsx` usa `Form` de shadcn. El campo de cubeta de presupuesto **se oculta cuando la dirección es `LENT`**, porque el backend rechaza esa combinación con 422: la interfaz no ofrece caminos que la API va a negar. El monto se escribe en unidades corrientes y se convierte con `parseMoneyInput` antes de enviarse.

- [ ] **Paso 8: Plan de pago**

`web/src/routes/plan-de-pago.tsx` muestra el orden que devuelve la API para la estrategia elegida, con un selector entre avalancha y bola de nieve, y una línea que explica el criterio de cada una. Debajo de la lista, una nota de que los préstamos otorgados no aparecen porque no compiten por el excedente.

- [ ] **Paso 9: Puerta de calidad de diseño**

Ninguna pantalla se da por terminada por el hecho de funcionar. Antes de verificar, con la app corriendo:

1. Capturar con Playwright cada ruta (`/deudas`, `/deudas/:id`, `/plan-de-pago`) a **360, 768 y 1440 px**, en **los dos temas**. Son nueve rutas-ancho por dos temas: dieciocho capturas. Mirarlas, no solo generarlas.
2. Capturar además los estados que no salen solos: lista vacía, lista con un elemento, lista con veinte, y la pantalla con la API apagada.
3. Correr `impeccable critique web/src` y resolver cada hallazgo.
4. Correr `impeccable audit web/src` y resolver cada hallazgo de accesibilidad, rendimiento y comportamiento responsivo.
5. Si el conjunto quedó tibio, `impeccable bolder`. Si quedó ruidoso, `impeccable quieter`.
6. Cerrar con `impeccable polish web/src`.

Criterio de rechazo, aplicado sin negociar: si alguna captura se parece a la plantilla de administración genérica —barra lateral gris, encabezado, cuatro tarjetas de métricas iguales arriba—, la pantalla se rehace. Lo mismo si todas las secciones tienen el mismo peso visual, si el espaciado es idéntico en todos lados, o si un extraño no podría decir qué es lo más importante de la pantalla en dos segundos.

- [ ] **Paso 10: Verificar**

```bash
cd web && npm test && npm run typecheck && npm run build
npm run dev
```

Verificación manual, con la API corriendo:

- [ ] Crear una deuda, verla en «lo que debo», abrir el detalle y ver las 120 cuotas
- [ ] Crear un préstamo otorgado y comprobar que aparece solo en la otra pestaña
- [ ] Simular un abono y ver el interés ahorrado sin recargar la página
- [ ] Apagar la API: cada pantalla muestra un toast de error, ninguna queda en blanco
- [ ] A 360 px la tabla es una lista y no hay desplazamiento horizontal en ninguna pantalla
- [ ] Recorrer toda la pantalla con el teclado: foco visible en cada control, orden lógico, ningún control inalcanzable
- [ ] Contraste verificado en los dos temas
- [ ] Correr `impeccable audit web/src` y `impeccable critique web/src` y resolver lo que salga

- [ ] **Paso 11: Commit**

```bash
git add web
git commit -m "✨ feat: pantallas de deudas, préstamos otorgados, amortización y simulador"
```

**Acceptance criteria:**
- [ ] Todo el copy salió de la skill `copywriting` y vive en `copy.ts`
- [ ] Bajo 768 px la tabla de amortización es una lista, no una tabla con desplazamiento
- [ ] El gráfico usa el componente `chart` de shadcn, sin importar Recharts directamente
- [ ] El resultado del simulador aparece en la página, no en un modal
- [ ] El formulario oculta la cubeta cuando la dirección es `LENT`
- [ ] Los tres estados —cargando, vacío y con datos— existen en las dos listas
- [ ] Todo error muestra un toast, sin `onError` repetido en cada hook
- [ ] Cada pantalla tiene sus cinco estados: cargando, vacía, con uno, con muchos y con error
- [ ] Las dieciocho capturas existen, fueron revisadas, y ninguna se parece a la plantilla de administración genérica
- [ ] `impeccable critique`, `audit` y `polish` corridos, con sus hallazgos resueltos

---

### Checkpoint: rebanada 1 completa

- [ ] `cd api && npm test` y `cd web && npm test` en verde
- [ ] Emilio puede cargar una deuda real, ver su tabla y simular un abono
- [ ] Las dos listas se distinguen y el plan de pago excluye los préstamos otorgados
- [ ] Revisión con Emilio antes de pasar a la rebanada 2

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El dist-tag `latest` de `prisma` apunta a un RC de la 8 | Alto | Versión pineada en la Tarea 7 y una nota de por qué; `npm ls prisma @prisma/client` debe mostrar 7.10.0 en ambos |
| `prisma.config.ts` con `earlyAccess` puede cambiar de forma en un parche de la 7.x | Medio | `npx prisma validate` es un paso explícito del plan, con la alternativa (`url` en el schema) escrita |
| `tanstackRouter()` después de `react()` falla en silencio | Medio | Orden fijado en el plan y verificado al arrancar: si `routeTree.gen.ts` no se genera, es esto |
| Testcontainers necesita Docker corriendo y la primera corrida descarga la imagen | Bajo | `beforeAll` con 180 s de tope; Docker ya está encendido en la máquina de Emilio |
| TypeScript 7 tienta pero rompe los decoradores de Nest | Medio | Pineado en 6.0.3 y explicado en las restricciones globales |
| shadcn sale con sus grises por defecto y la app parece una plantilla | Alto | `PRODUCT.md` y `DESIGN.md` son el Paso 1 de la Tarea 10, antes de cualquier componente |

## Preguntas abiertas

- Ninguna bloqueante. La paleta concreta se cierra en el Paso 1 de la Tarea 10 con `impeccable teach`, dentro de las restricciones ya fijadas: oscuro por defecto con claro completo, estrategia restrained, sin dorado ni sus vecinos.
