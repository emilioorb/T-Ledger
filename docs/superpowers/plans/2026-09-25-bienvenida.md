# Bienvenida — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un modal guiado por Nimbo que, la primera vez que alguien entra, le deja crear sus bancos, saldos, categorías con cuenta propia y el ingreso del mes, y lo manda a la guía.

**Architecture:** Módulo Nest nuevo `onboarding` que solo coordina casos de uso existentes de accounting, banking y budget; cada paso es idempotente por libro gracias a la tabla `OnboardingStep`, dentro de la transacción con candado del libro. La marca «ya la vio» vive en `authUser` y la escribe identity por un puerto. En la web, un modal cargado con `lazy()` desde el shell.

**Tech Stack:** NestJS 11, Prisma 7 (Postgres), Better Auth, Zod + zod-openapi, Vitest + Testcontainers (api); React 19, TanStack Query/Router, Tailwind 4, shadcn/ui, Vitest + Testing Library (web).

**Spec:** `docs/superpowers/specs/2026-09-25-bienvenida-design.md`

## Global Constraints

- Leé `CONSTRAINTS.md` antes de empezar. Piso: sin `@ts-ignore`/`eslint-disable`/`oxlint-disable`, sin `TODO`/`FIXME`, sin `catch {}` vacío, sin tests saltados.
- Cero errores de `tsc` y de lint; toda la suite en verde.
- Cobertura de lo nuevo ≥ 80 % (`node scripts/cobertura-de-lo-nuevo.mjs`).
- Bundle: JS de entrada ≤ 115,4 kB brotli (`npx size-limit` en `web`). El modal va con `lazy()`.
- Sin `any`. TypeScript estricto. Comentarios solo donde la lógica no es obvia, en español, en el tono de los que ya hay.
- Rutas HTTP en inglés (`/onboarding/...`); identificadores de dominio y comentarios en español donde el módulo vecino lo hace así.
- Commits: Conventional Commits con gitmoji (`✨ feat:`, `🐛 fix:`, `✅ test:`…), **sin** `Co-Authored-By`. Cerrar el mensaje con la línea `Claude-Session: https://claude.ai/code/session_01RYBjQ1h56VrXYBL4936Wjk`.
- Rastro: ADR-004 sin cambios, ninguna `EntidadAuditada` nueva.
- Códigos de cuenta: bancos 1121–1189 bajo 1100; agrupadoras 6200 «Gastos por categoría» (bajo 6000) y 4200 «Ingresos por categoría» (bajo 4000); categorías 6201–6299 y 4201–4299.
- Errores: 400 forma (Zod), 422 regla (`SemanticValidationError`), 409 unicidad (`ConflictError`). No hay códigos nuevos.
- `check:task` al final de cada tarea de api (`npm run check:task` en la raíz).

## Review Focus

1. **Reintento con respuesta perdida:** llamar dos veces al mismo paso devuelve lo mismo y no crea nada nuevo. Test en cada paso (Tareas 6–9).
2. **Fallo a mitad de un paso:** si el segundo banco falla, el primero no queda creado y no hay fila de progreso. Test en Tarea 6.
3. **Montos con signo y en cero en saldos:** sobregiro de banco al haber, caja negativa 422, neto cero sin contrapartida, ceros ignorados. Tests en Tarea 7.
4. **Nombres de categoría que chocan** (dentro del pedido y con los existentes, sin distinguir mayúsculas y espacios): 409 antes de escribir. Test en Tarea 8.
5. **Invitado nuevo:** registrarse con una invitación pendiente a un libro deja la marca puesta; con una vencida, no. Test en Tarea 3.

---

## Mapa de archivos

**Api — nuevos**
- `api/src/modules/accounting/domain/codigo-libre.ts` (+ `.spec.ts`): `siguienteCodigoLibre`.
- `api/src/modules/accounting/infrastructure/cajas.ts` (+ `.spec.ts`): `CAJAS`.
- `api/prisma/migrations/20260925120000_bienvenida/migration.sql`
- `api/src/modules/identity/domain/marca-de-bienvenida.port.ts`
- `api/src/modules/identity/infrastructure/prisma-marca-de-bienvenida.ts`
- `api/src/modules/identity/infrastructure/bienvenida-al-registrarse.ts` (+ `.e2e.spec.ts`)
- `api/src/modules/onboarding/onboarding.module.ts`
- `api/src/modules/onboarding/domain/onboarding-step-repository.port.ts`
- `api/src/modules/onboarding/infrastructure/prisma-onboarding-step.repository.ts`
- `api/src/modules/onboarding/application/paso-idempotente.ts`
- `api/src/modules/onboarding/application/estado-de-bienvenida.use-case.ts`
- `api/src/modules/onboarding/application/crear-bancos.use-case.ts`
- `api/src/modules/onboarding/application/cargar-saldos.use-case.ts`
- `api/src/modules/onboarding/application/crear-categorias.use-case.ts`
- `api/src/modules/onboarding/application/declarar-ingreso-inicial.use-case.ts`
- `api/src/modules/onboarding/infrastructure/onboarding.controller.ts` (+ `.spec.ts`)
- `api/src/modules/onboarding/infrastructure/onboarding.schemas.ts`
- `api/src/modules/onboarding/infrastructure/onboarding.openapi.ts`

**Api — modificados**
- `api/prisma/schema.prisma` (authUser, OnboardingStep, relación en book)
- `api/src/modules/identity/infrastructure/auth.config.ts` (additionalFields, gancho de registro)
- `api/src/modules/identity/identity.module.ts` (provee y exporta el puerto)
- `api/src/modules/identity/infrastructure/roles.ts`, `permisos.ts` (recurso `bienvenida`)
- `api/src/modules/libro/domain/vaciado.ts` (`onboardingStep` en `SE_BORRA`)
- `api/src/modules/accounting/accounting.module.ts`, `banking/banking.module.ts`, `budget/budget.module.ts` (exports)
- `api/src/app.module.ts`, `api/src/shared/http/openapi.document.ts`

**Web — nuevos** (`web/src/features/onboarding/`)
- `copy.ts`, `types.ts`, `use-onboarding.ts`
- `nimbo-dice.tsx` (+ `.spec.tsx`)
- `bienvenida.tsx` (+ `.spec.tsx`): modal, máquina de pasos, cierre con confirmación.
- `pasos/intro.tsx`, `pasos/monedas.tsx`, `pasos/bancos.tsx`, `pasos/saldos.tsx`, `pasos/categorias.tsx`, `pasos/ingreso.tsx`, `pasos/cierre.tsx`
- `pasos/pasos.spec.tsx`

**Web — modificados**
- `web/src/routes/__root.tsx` (monta `Bienvenida` con `lazy`)
- `web/src/lib/query-keys.ts` (clave `onboarding`)
- `web/src/lib/api-types.gen.ts` (regenerado)
- `web/src/features/shell/novedades.md`

---

### Task 1: Códigos libres y cajas (dominio de accounting)

**Files:**
- Create: `api/src/modules/accounting/domain/codigo-libre.ts`
- Create: `api/src/modules/accounting/domain/codigo-libre.spec.ts`
- Create: `api/src/modules/accounting/infrastructure/cajas.ts`
- Create: `api/src/modules/accounting/infrastructure/cajas.spec.ts`

**Interfaces:**
- Produces: `siguienteCodigoLibre(ocupados: ReadonlySet<string>, desde: number, hasta: number): Result<string, RangeError>`; `CAJAS: Readonly<Record<string, Currency>>` con `{ '1101': 'CRC', '1102': 'USD' }`.

- [ ] **Step 1: Test de `siguienteCodigoLibre`**

```ts
// api/src/modules/accounting/domain/codigo-libre.spec.ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '../../../shared/kernel/result.js'
import { siguienteCodigoLibre } from './codigo-libre.js'

const libre = (ocupados: string[], desde: number, hasta: number) => {
  const resultado = siguienteCodigoLibre(new Set(ocupados), desde, hasta)
  if (!isOk(resultado)) throw resultado.error
  return resultado.value
}

describe('siguienteCodigoLibre', () => {
  it('sin nada ocupado da el primero del rango', () => {
    expect(libre([], 1121, 1189)).toBe('1121')
  })

  it('salta los ocupados y usa el primer hueco', () => {
    expect(libre(['1121', '1122', '1124'], 1121, 1189)).toBe('1123')
  })

  it('cuenta como ocupado un código aunque cuelgue de otra madre', () => {
    // La clave es libro más código: una 1121 de cualquier rama ya lo toma.
    expect(libre(['1121'], 1121, 1189)).toBe('1122')
  })

  it('con el rango lleno devuelve error', () => {
    const todos = Array.from({ length: 3 }, (_, i) => String(6201 + i))
    const resultado = siguienteCodigoLibre(new Set(todos), 6201, 6203)
    expect(isErr(resultado)).toBe(true)
  })
})
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `cd api && npx vitest run src/modules/accounting/domain/codigo-libre.spec.ts`
Expected: FAIL, «Cannot find module './codigo-libre.js'».

- [ ] **Step 3: Implementar**

```ts
// api/src/modules/accounting/domain/codigo-libre.ts
import { err, ok, type Result } from '../../../shared/kernel/result.js'

// Busca contra todos los códigos del libro y no solo contra las hijas de la madre: la clave de
// una cuenta es libro más código, así que un código tomado en cualquier rama choca igual.
export const siguienteCodigoLibre = (
  ocupados: ReadonlySet<string>,
  desde: number,
  hasta: number,
): Result<string, RangeError> => {
  for (let codigo = desde; codigo <= hasta; codigo++) {
    if (!ocupados.has(String(codigo))) return ok(String(codigo))
  }
  return err(new RangeError(`No quedan códigos libres entre ${desde} y ${hasta}.`))
}
```

- [ ] **Step 4: Test de `CAJAS`**

```ts
// api/src/modules/accounting/infrastructure/cajas.spec.ts
import { describe, expect, it } from 'vitest'
import { CAJAS } from './cajas.js'
import { CHART_SEED } from './chart-seed.js'

describe('CAJAS', () => {
  it('nombra cuentas que la semilla crea y que aceptan asientos', () => {
    const madres = new Set(CHART_SEED.map((cuenta) => cuenta.parentCode))
    for (const codigo of Object.keys(CAJAS)) {
      const semilla = CHART_SEED.find((cuenta) => cuenta.code === codigo)
      expect(semilla, `falta ${codigo} en la semilla`).toBeDefined()
      expect(madres.has(codigo), `${codigo} es agrupadora`).toBe(false)
    }
  })
})
```

- [ ] **Step 5: Implementar `CAJAS`**

```ts
// api/src/modules/accounting/infrastructure/cajas.ts
import type { Currency } from '../../../shared/kernel/currency.js'

// Las cuentas no tienen moneda: la caja en colones y la caja en dólares se distinguen solo por
// el código que les da la semilla. Esto lo deja escrito en un lugar, al lado de la semilla, y
// su test falla si la semilla cambia sin avisar.
export const CAJAS: Readonly<Record<string, Currency>> = { '1101': 'CRC', '1102': 'USD' }
```

Si `Currency` no se llama así en `shared/kernel/currency.ts`, usar el tipo que ese archivo exporte para `CURRENCIES[number]`.

- [ ] **Step 6: Correr los dos tests**

Run: `cd api && npx vitest run src/modules/accounting/domain/codigo-libre.spec.ts src/modules/accounting/infrastructure/cajas.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/accounting/domain/codigo-libre.ts api/src/modules/accounting/domain/codigo-libre.spec.ts api/src/modules/accounting/infrastructure/cajas.ts api/src/modules/accounting/infrastructure/cajas.spec.ts
git commit -m "✨ feat: códigos libres del plan y cajas por moneda para la bienvenida"
```

---

### Task 2: Datos — marca, progreso y vaciado

**Files:**
- Modify: `api/prisma/schema.prisma` (model `authUser`, model `book`, model nuevo `OnboardingStep`)
- Create: `api/prisma/migrations/20260925120000_bienvenida/migration.sql`
- Modify: `api/src/modules/identity/infrastructure/auth.config.ts` (bloque `user`)
- Modify: `api/src/modules/libro/domain/vaciado.ts`

**Interfaces:**
- Produces: columna `authUser.bienvenidaVistaEn` (`DateTime?`), modelo Prisma `onboardingStep` (`bookId`, `step`, `result: Json`, `createdAt`).

- [ ] **Step 1: Esquema**

En `model authUser`, después de `updatedAt`:

```prisma
  // Cuándo vio la bienvenida. `null`: todavía no. Se marca al abrirla, no al terminarla, porque
  // se muestra una sola vez aunque se cierre a mitad.
  bienvenidaVistaEn DateTime?        @db.Timestamptz(3)
```

En `model book`, junto a las otras relaciones:

```prisma
  onboardingSteps         OnboardingStep[]
```

Modelo nuevo, después de `InvitationLink`:

```prisma
// Qué pasos de la bienvenida ya se hicieron en este libro y qué crearon. Es lo que hace
// idempotente cada paso: un reintento con la respuesta perdida devuelve lo mismo en vez de
// duplicar bancos o asientos.
model OnboardingStep {
  bookId    String
  step      String
  result    Json
  createdAt DateTime @default(now()) @db.Timestamptz(3)

  book book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@id([bookId, step])
  @@map("onboarding_steps")
}
```

- [ ] **Step 2: Migración escrita a mano**

```sql
-- api/prisma/migrations/20260925120000_bienvenida/migration.sql
ALTER TABLE "authUser" ADD COLUMN "bienvenidaVistaEn" TIMESTAMPTZ(3);

-- Quien ya usa la app no la ve: se marca con su alta, no con la hora del despliegue.
UPDATE "authUser" SET "bienvenidaVistaEn" = "createdAt";

CREATE TABLE "onboarding_steps" (
    "bookId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("bookId","step")
);

ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Verificar el nombre real de la tabla de libros en `schema.prisma` (`@@map` de `model book`) y usarlo en el `REFERENCES`.

- [ ] **Step 3: Regenerar el cliente y comprobar que el esquema y la migración coinciden**

Run: `cd api && npx prisma generate && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --script`
Expected: salida vacía (sin diferencias). Si no hay base sombra a mano, levantar una con `docker run --rm -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:17` y usar `postgresql://postgres:x@localhost:55432/postgres`.

- [ ] **Step 4: Better Auth no pierde la columna ni deja escribirla**

En `auth.config.ts`, dentro de `user: { modelName: 'authUser', ... }`, agregar:

```ts
      // Declarada para que la CLI de Better Auth no la borre al regenerar el esquema (ADR-001).
      // `input: false`: ni el alta ni `/update-user` la escriben. Si se pudiera mandar `null`,
      // la bienvenida volvería a abrirse y sus pasos se repetirían.
      additionalFields: {
        bienvenidaVistaEn: { type: 'date', required: false, input: false },
      },
```

- [ ] **Step 5: Test de que no se escribe desde afuera**

Agregar a `api/src/modules/identity/infrastructure/auth.config.e2e.spec.ts`, en el `describe('registro', ...)`:

```ts
  it('la marca de la bienvenida no se puede mandar al registrarse', async () => {
    const token = await enlaceALaApp('marca@tape.test')
    const alta = auth.api.signUpEmail({
      headers: conEnlace(token),
      body: { name: 'Marca', email: 'marca@tape.test', password: 'una-clave-larga', bienvenidaVistaEn: new Date() } as never,
    })
    await expect(alta).rejects.toThrow()
  })
```

Si Better Auth ignora el campo en vez de rechazar el alta, cambiar la aserción a: el alta funciona y `prisma.authUser.findUnique({ where: { email: 'marca@tape.test' } })` tiene `bienvenidaVistaEn` en `null`. El `as never` es el mismo recurso que ya usa el archivo para mandar cuerpos inválidos; si el lint lo rechaza, construir el cuerpo como `Record<string, unknown>`.

- [ ] **Step 6: Vaciado**

En `api/src/modules/libro/domain/vaciado.ts`, al final de `SE_BORRA`:

```ts
  // El progreso de la bienvenida nombra asientos que el vaciado se lleva: se va con ellos.
  'onboardingStep',
```

- [ ] **Step 7: Guardias del esquema**

Run: `cd api && npx vitest run src/modules/libro src/modules/identity/infrastructure/auth.config.e2e.spec.ts`
Expected: PASS, incluidos `vaciado.spec.ts` y `borrado.spec.ts`.

- [ ] **Step 8: Commit**

```bash
git add api/prisma api/src/modules/identity/infrastructure/auth.config.ts api/src/modules/identity/infrastructure/auth.config.e2e.spec.ts api/src/modules/libro/domain/vaciado.ts api/src/generated
git commit -m "✨ feat: marca de bienvenida por persona y progreso por libro"
```

---

### Task 3: Identity — puerto de la marca y bienvenida al registrarse

**Files:**
- Create: `api/src/modules/identity/domain/marca-de-bienvenida.port.ts`
- Create: `api/src/modules/identity/infrastructure/prisma-marca-de-bienvenida.ts`
- Create: `api/src/modules/identity/infrastructure/bienvenida-al-registrarse.ts`
- Create: `api/src/modules/identity/infrastructure/bienvenida-al-registrarse.e2e.spec.ts`
- Modify: `api/src/modules/identity/infrastructure/auth.config.ts` (`user.create.after`)
- Modify: `api/src/modules/identity/identity.module.ts`

**Interfaces:**
- Consumes: columna `authUser.bienvenidaVistaEn` (Tarea 2).
- Produces:
  - `MARCA_DE_BIENVENIDA: symbol`
  - `interface MarcaDeBienvenida { vista(userId: string): Promise<boolean>; marcar(userId: string): Promise<void> }`
  - `marcarSiTieneInvitacion(prisma: PrismaClient, userId: string, email: string, ahora: Date): Promise<boolean>`

- [ ] **Step 1: El puerto**

```ts
// api/src/modules/identity/domain/marca-de-bienvenida.port.ts
// Si la persona ya vio la bienvenida. Es de identity porque vive en su tabla; la bienvenida la
// consulta y la marca por acá, sin tocar tablas de Better Auth.
export interface MarcaDeBienvenida {
  vista(userId: string): Promise<boolean>
  // Marcar dos veces no es un error: dos pestañas pueden abrirla a la vez.
  marcar(userId: string): Promise<void>
}

export const MARCA_DE_BIENVENIDA = Symbol('MARCA_DE_BIENVENIDA')
```

- [ ] **Step 2: Test e2e del adaptador y del registro**

```ts
// api/src/modules/identity/infrastructure/bienvenida-al-registrarse.e2e.spec.ts
import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { marcarSiTieneInvitacion } from './bienvenida-al-registrarse.js'
import { PrismaMarcaDeBienvenida } from './prisma-marca-de-bienvenida.js'

let postgres: RunningPostgres
let prisma: PrismaClient

const AHORA = new Date('2026-09-25T15:00:00.000Z')

const persona = (id: string) =>
  prisma.authUser.create({ data: { id, name: id, email: `${id}@tape.test` } })

const libroConInvitacion = async (email: string, expiresAt: Date, status = 'pending') => {
  await persona(`dueno-${email}`)
  const libro = await prisma.book.create({
    data: { id: `lib-${email}`, name: 'Casa', slug: `casa-${email}`, createdAt: AHORA },
  })
  await prisma.bookInvitation.create({
    data: { id: `inv-${email}`, organizationId: libro.id, email, role: 'editor', status, expiresAt, inviterId: `dueno-${email}` },
  })
}

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) })
}, 120_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

describe('marca de la bienvenida', () => {
  it('nace sin ver y queda vista al marcarla, dos veces sin error', async () => {
    const marca = new PrismaMarcaDeBienvenida(prisma)
    await persona('ana')
    expect(await marca.vista('ana')).toBe(false)
    await marca.marcar('ana')
    await marca.marcar('ana')
    expect(await marca.vista('ana')).toBe(true)
  })
})

describe('al registrarse', () => {
  it('con una invitación pendiente a un libro, la bienvenida queda vista', async () => {
    await libroConInvitacion('invitada@tape.test', new Date(AHORA.getTime() + 86_400_000))
    await persona('invitada')
    expect(await marcarSiTieneInvitacion(prisma, 'invitada', 'invitada@tape.test', AHORA)).toBe(true)
    expect(await new PrismaMarcaDeBienvenida(prisma).vista('invitada')).toBe(true)
  })

  it('con la invitación vencida, no', async () => {
    await libroConInvitacion('vencida@tape.test', new Date(AHORA.getTime() - 1))
    await persona('vencida')
    expect(await marcarSiTieneInvitacion(prisma, 'vencida', 'vencida@tape.test', AHORA)).toBe(false)
    expect(await new PrismaMarcaDeBienvenida(prisma).vista('vencida')).toBe(false)
  })

  it('con la invitación ya respondida, no', async () => {
    await libroConInvitacion('respondida@tape.test', new Date(AHORA.getTime() + 86_400_000), 'canceled')
    await persona('respondida')
    expect(await marcarSiTieneInvitacion(prisma, 'respondida', 'respondida@tape.test', AHORA)).toBe(false)
  })
})
```

Si `book.create` exige más campos, copiarlos del `model book` del esquema.

- [ ] **Step 3: Correrlo y ver que falla**

Run: `cd api && npx vitest run src/modules/identity/infrastructure/bienvenida-al-registrarse.e2e.spec.ts`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 4: Adaptador**

```ts
// api/src/modules/identity/infrastructure/prisma-marca-de-bienvenida.ts
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { MarcaDeBienvenida } from '../domain/marca-de-bienvenida.port.js'

// Sobre el cliente sin filtro de libro, como todo lo que toca tablas de Better Auth: la marca es
// de la persona, no de ningún libro.
export class PrismaMarcaDeBienvenida implements MarcaDeBienvenida {
  constructor(private readonly prisma: PrismaClient) {}

  async vista(userId: string): Promise<boolean> {
    const persona = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: { bienvenidaVistaEn: true },
    })
    return persona?.bienvenidaVistaEn != null
  }

  // `updateMany` y no `update`: con la condición sobre la marca, `update` tira cuando ya estaba
  // puesta, y marcar dos veces tiene que dar lo mismo.
  async marcar(userId: string): Promise<void> {
    await this.prisma.authUser.updateMany({
      where: { id: userId, bienvenidaVistaEn: null },
      data: { bienvenidaVistaEn: new Date() },
    })
  }
}
```

- [ ] **Step 5: Marca al registrarse**

```ts
// api/src/modules/identity/infrastructure/bienvenida-al-registrarse.ts
import type { PrismaClient } from '../../../generated/prisma/client.js'

// Para aceptar la invitación a un libro hay que tener cuenta, así que el invitado primero se
// registra, cae en su libro «Personal» y ahí vería la bienvenida antes de poder aceptar. Si al
// registrarse ya lo esperan en un libro, viene a ese libro: la bienvenida no es para él.
export const marcarSiTieneInvitacion = async (
  prisma: PrismaClient,
  userId: string,
  email: string,
  ahora: Date,
): Promise<boolean> => {
  const invitacion = await prisma.bookInvitation.findFirst({
    where: { email, status: 'pending', expiresAt: { gt: ahora } },
    select: { id: true },
  })
  if (!invitacion) return false
  await prisma.authUser.updateMany({
    where: { id: userId, bienvenidaVistaEn: null },
    data: { bienvenidaVistaEn: ahora },
  })
  return true
}
```

Verificar en `auth.config.ts` si las invitaciones guardan el correo en minúsculas; si el alta normaliza el correo, normalizar igual acá.

- [ ] **Step 6: Engancharlo en el registro**

En `auth.config.ts`, dentro de `user.create.after`, **antes** de `auth.api.createOrganization(...)`:

```ts
            // Una bienvenida de más es mejor que un registro roto: si esto falla, se sigue.
            await marcarSiTieneInvitacion(prisma, usuario.id, usuario.email, new Date()).catch((error: unknown) =>
              logger.warn(`No se pudo revisar la invitación al registrarse: ${error instanceof Error ? error.name : 'desconocido'}`),
            )
```

Importar `marcarSiTieneInvitacion` arriba.

- [ ] **Step 7: Proveer el puerto**

En `identity.module.ts`, agregar a `providers`:

```ts
    // Sin filtro de libro: la marca es de la persona.
    {
      provide: MARCA_DE_BIENVENIDA,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaMarcaDeBienvenida(prisma.clientSinFiltroDeLibro),
    },
```

y `MARCA_DE_BIENVENIDA` a `exports`.

- [ ] **Step 8: Correr identity**

Run: `cd api && npx vitest run src/modules/identity`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api/src/modules/identity
git commit -m "✨ feat: la bienvenida no aparece a quien viene invitado a un libro"
```

---

### Task 4: Permiso `bienvenida`

**Files:**
- Modify: `api/src/modules/identity/infrastructure/roles.ts`
- Modify: `api/src/modules/identity/infrastructure/permisos.ts`
- Test: `api/src/modules/identity/infrastructure/roles.spec.ts`

**Interfaces:**
- Produces: `Recurso` incluye `'bienvenida'`; `puede('owner', 'bienvenida', 'write') === true`, `false` para `editor` y `viewer`.

- [ ] **Step 1: Test**

Agregar a `roles.spec.ts`:

```ts
  it('solo el dueño configura el libro desde la bienvenida', () => {
    expect(puede('owner', 'bienvenida', 'write')).toBe(true)
    expect(puede('editor', 'bienvenida', 'write')).toBe(false)
    expect(puede('viewer', 'bienvenida', 'write')).toBe(false)
  })
```

Importar `puede` de `./permisos.js` si el archivo no lo hace.

- [ ] **Step 2: Ver que falla**

Run: `cd api && npx vitest run src/modules/identity/infrastructure/roles.spec.ts`
Expected: FAIL de tipos o de aserción.

- [ ] **Step 3: Implementar**

`roles.ts`, en `statements`:

```ts
  // Crea cuentas, bancos, categorías y asientos de una vez: arma el libro, y eso lo decide el dueño.
  bienvenida: ['write'],
```

En `owner`, después de `auditoria: ['read']`:

```ts
  bienvenida: ['write'],
```

`permisos.ts`, en `Recurso`: `| 'bienvenida'`.

- [ ] **Step 4: Correr**

Run: `cd api && npx vitest run src/modules/identity/infrastructure/roles.spec.ts src/modules/identity/infrastructure/permisos.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/identity/infrastructure/roles.ts api/src/modules/identity/infrastructure/permisos.ts api/src/modules/identity/infrastructure/roles.spec.ts
git commit -m "✨ feat: permiso de bienvenida solo para el dueño del libro"
```

---

### Task 5: Módulo `onboarding` — progreso, estado y marca

**Files:**
- Create: `api/src/modules/onboarding/domain/onboarding-step-repository.port.ts`
- Create: `api/src/modules/onboarding/infrastructure/prisma-onboarding-step.repository.ts`
- Create: `api/src/modules/onboarding/application/paso-idempotente.ts`
- Create: `api/src/modules/onboarding/application/estado-de-bienvenida.use-case.ts`
- Create: `api/src/modules/onboarding/infrastructure/onboarding.schemas.ts`
- Create: `api/src/modules/onboarding/infrastructure/onboarding.controller.ts`
- Create: `api/src/modules/onboarding/infrastructure/onboarding.controller.spec.ts`
- Create: `api/src/modules/onboarding/onboarding.module.ts`
- Modify: `api/src/modules/accounting/accounting.module.ts`, `api/src/modules/banking/banking.module.ts`, `api/src/modules/budget/budget.module.ts` (exports)
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `MARCA_DE_BIENVENIDA` (Tarea 3), recurso `bienvenida` (Tarea 4), modelo `onboardingStep` (Tarea 2).
- Produces:
  - `type PasoDeBienvenida = 'banks' | 'opening-balances' | 'categories' | 'income'`
  - `interface OnboardingStepRepository { find(step: PasoDeBienvenida): Promise<unknown | null>; findAll(): Promise<Partial<Record<PasoDeBienvenida, unknown>>>; save(step: PasoDeBienvenida, result: unknown): Promise<void> }` y `ONBOARDING_STEP_REPOSITORY`
  - `class PasoIdempotente { correr<T>(paso: PasoDeBienvenida, hacer: () => Promise<T>): Promise<T> }`
  - `class EstadoDeBienvenidaUseCase { estado(): Promise<{ pending: boolean; bookId: string; steps: Partial<Record<PasoDeBienvenida, unknown>> }>; empezar(): Promise<void> }`
  - Exports nuevos: `SaveAccountUseCase`, `ManageCategoriesUseCase` (accounting); `ManageBankAccountsUseCase` (banking); `DeclararIngresoUseCase` (budget).

- [ ] **Step 1: Exports de los módulos vecinos**

- `accounting.module.ts`: agregar `SaveAccountUseCase` y `ManageCategoriesUseCase` al arreglo `exports`.
- `banking.module.ts`: agregar `exports: [ManageBankAccountsUseCase]` al decorador `@Module`.
- `budget.module.ts`: `exports: [BUDGET_INCOME_REPOSITORY, BucketGuard, DeclararIngresoUseCase]`, con el comentario de al lado ampliado a «y la bienvenida declara el primero».

- [ ] **Step 2: Puerto y repositorio**

```ts
// api/src/modules/onboarding/domain/onboarding-step-repository.port.ts
export const PASOS_DE_BIENVENIDA = ['banks', 'opening-balances', 'categories', 'income'] as const
export type PasoDeBienvenida = (typeof PASOS_DE_BIENVENIDA)[number]

// El resultado es lo que el paso devolvió la primera vez. Se guarda tal cual para devolverlo
// igual ante un reintento.
export interface OnboardingStepRepository {
  find(step: PasoDeBienvenida): Promise<unknown | null>
  findAll(): Promise<Partial<Record<PasoDeBienvenida, unknown>>>
  save(step: PasoDeBienvenida, result: unknown): Promise<void>
}

export const ONBOARDING_STEP_REPOSITORY = Symbol('ONBOARDING_STEP_REPOSITORY')
```

```ts
// api/src/modules/onboarding/infrastructure/prisma-onboarding-step.repository.ts
import { Injectable } from '@nestjs/common'
import type { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import {
  PASOS_DE_BIENVENIDA,
  type OnboardingStepRepository,
  type PasoDeBienvenida,
} from '../domain/onboarding-step-repository.port.js'

const esPaso = (valor: string): valor is PasoDeBienvenida =>
  (PASOS_DE_BIENVENIDA as readonly string[]).includes(valor)

@Injectable()
export class PrismaOnboardingStepRepository implements OnboardingStepRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(step: PasoDeBienvenida): Promise<unknown | null> {
    const fila = await this.prisma.client.onboardingStep.findUnique({
      where: { bookId_step: { bookId: this.prisma.libro, step } },
    })
    return fila?.result ?? null
  }

  async findAll(): Promise<Partial<Record<PasoDeBienvenida, unknown>>> {
    const filas = await this.prisma.client.onboardingStep.findMany({ where: { bookId: this.prisma.libro } })
    return Object.fromEntries(filas.filter((fila) => esPaso(fila.step)).map((fila) => [fila.step, fila.result]))
  }

  async save(step: PasoDeBienvenida, result: unknown): Promise<void> {
    await this.prisma.client.onboardingStep.create({
      data: { bookId: this.prisma.libro, step, result: result as Prisma.InputJsonValue },
    })
  }
}
```

- [ ] **Step 3: Paso idempotente**

```ts
// api/src/modules/onboarding/application/paso-idempotente.ts
import { Inject, Injectable } from '@nestjs/common'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import {
  ONBOARDING_STEP_REPOSITORY,
  type OnboardingStepRepository,
  type PasoDeBienvenida,
} from '../domain/onboarding-step-repository.port.js'

// Lee, hace y anota en una sola transacción, con el candado del libro tomado (ADR-006). Si el
// paso ya estaba, devuelve lo que devolvió entonces: es la respuesta a un reintento cuya
// respuesta se perdió. Si falla a mitad, no queda ni lo hecho ni la anotación.
@Injectable()
export class PasoIdempotente {
  constructor(
    @Inject(ONBOARDING_STEP_REPOSITORY) private readonly pasos: OnboardingStepRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  correr<T>(paso: PasoDeBienvenida, hacer: () => Promise<T>): Promise<T> {
    return this.transaction.withTransaction(async () => {
      const hecho = await this.pasos.find(paso)
      if (hecho !== null) return hecho as T
      const resultado = await hacer()
      await this.pasos.save(paso, resultado)
      return resultado
    })
  }
}
```

- [ ] **Step 4: Estado**

```ts
// api/src/modules/onboarding/application/estado-de-bienvenida.use-case.ts
import { Inject, Injectable } from '@nestjs/common'
import { libroActual } from '../../../shared/libro/libro-context.js'
import {
  MARCA_DE_BIENVENIDA,
  type MarcaDeBienvenida,
} from '../../identity/domain/marca-de-bienvenida.port.js'
import {
  ONBOARDING_STEP_REPOSITORY,
  type OnboardingStepRepository,
  type PasoDeBienvenida,
} from '../domain/onboarding-step-repository.port.js'

export interface EstadoDeBienvenida {
  pending: boolean
  bookId: string
  steps: Partial<Record<PasoDeBienvenida, unknown>>
}

@Injectable()
export class EstadoDeBienvenidaUseCase {
  constructor(
    @Inject(MARCA_DE_BIENVENIDA) private readonly marca: MarcaDeBienvenida,
    @Inject(ONBOARDING_STEP_REPOSITORY) private readonly pasos: OnboardingStepRepository,
  ) {}

  // Solo el dueño la ve: los pasos crean cuentas y asientos, y un editor recibiría 403 en cada
  // uno sin poder cerrarla.
  async estado(): Promise<EstadoDeBienvenida> {
    const { bookId, userId, rol } = libroActual()
    const vista = await this.marca.vista(userId)
    return { pending: !vista && rol === 'owner', bookId, steps: await this.pasos.findAll() }
  }

  empezar(): Promise<void> {
    return this.marca.marcar(libroActual().userId)
  }
}
```

- [ ] **Step 5: Esquemas (los de los pasos se suman en las tareas 6–9)**

```ts
// api/src/modules/onboarding/infrastructure/onboarding.schemas.ts
import { z } from 'zod'

export const onboardingStatusResponseSchema = z
  .object({
    pending: z.boolean(),
    bookId: z.string(),
    steps: z.record(z.string(), z.unknown()),
  })
  .meta({ id: 'OnboardingStatus', title: 'OnboardingStatus' })
```

- [ ] **Step 6: Controlador**

```ts
// api/src/modules/onboarding/infrastructure/onboarding.controller.ts
import { Controller, Get, HttpCode, Post } from '@nestjs/common'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import {
  EstadoDeBienvenidaUseCase,
  type EstadoDeBienvenida,
} from '../application/estado-de-bienvenida.use-case.js'

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly estado: EstadoDeBienvenidaUseCase) {}

  @Get()
  status(): Promise<EstadoDeBienvenida> {
    return this.estado.estado()
  }

  // Se llama al abrir el modal. 204 siempre: si ya estaba vista, no hay nada que avisar.
  @Permiso('bienvenida', 'write')
  @Post('start')
  @HttpCode(204)
  start(): Promise<void> {
    return this.estado.empezar()
  }
}
```

- [ ] **Step 7: Módulo y registro**

```ts
// api/src/modules/onboarding/onboarding.module.ts
import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { BankingModule } from '../banking/banking.module.js'
import { BudgetModule } from '../budget/budget.module.js'
import { EstadoDeBienvenidaUseCase } from './application/estado-de-bienvenida.use-case.js'
import { PasoIdempotente } from './application/paso-idempotente.js'
import { ONBOARDING_STEP_REPOSITORY } from './domain/onboarding-step-repository.port.js'
import { OnboardingController } from './infrastructure/onboarding.controller.js'
import { PrismaOnboardingStepRepository } from './infrastructure/prisma-onboarding-step.repository.js'

// Solo coordina: cada paso llama a los casos de uso de su módulo, que conservan sus reglas.
// Nadie depende de este módulo.
@Module({
  imports: [PrismaModule, AccountingModule, BankingModule, BudgetModule],
  controllers: [OnboardingController],
  providers: [
    { provide: ONBOARDING_STEP_REPOSITORY, useClass: PrismaOnboardingStepRepository },
    PasoIdempotente,
    EstadoDeBienvenidaUseCase,
  ],
})
export class OnboardingModule {}
```

En `app.module.ts`, importar `OnboardingModule` y agregarlo a `imports` después de `BankingModule`.

- [ ] **Step 8: Spec del controlador — armado compartido y estado**

```ts
// api/src/modules/onboarding/infrastructure/onboarding.controller.spec.ts
import { EventEmitterModule } from '@nestjs/event-emitter'
import type { INestApplication } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { entrarEnLibro } from '../../../shared/libro/libro-context.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { MARCA_DE_BIENVENIDA, type MarcaDeBienvenida } from '../../identity/domain/marca-de-bienvenida.port.js'
import { PermisoGuard } from '../../identity/infrastructure/permiso.guard.js'
import { RastroModule } from '../../auditoria/rastro.module.js'
import { OnboardingModule } from '../onboarding.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService
const vistas = new Set<string>()

// La marca de verdad vive en tablas de Better Auth; acá alcanza con un doble en memoria.
const marcaEnMemoria: MarcaDeBienvenida = {
  vista: async (userId) => vistas.has(userId),
  marcar: async (userId) => void vistas.add(userId),
}

@Global()
@Module({
  providers: [{ provide: MARCA_DE_BIENVENIDA, useValue: marcaEnMemoria }, { provide: APP_GUARD, useClass: PermisoGuard }],
  exports: [MARCA_DE_BIENVENIDA],
})
class IdentidadDePrueba {}

const BASE = '/api/v1/onboarding'
export const pedir = {
  get: (path = '') => request(app.getHttpServer()).get(`${BASE}${path}`),
  post: (path: string, body: object = {}) => request(app.getHttpServer()).post(`${BASE}${path}`).send(body),
}

const comoDueno = () => entrarEnLibro(LIBRO_DE_PRUEBA)
const comoEditor = () => entrarEnLibro({ ...LIBRO_DE_PRUEBA, rol: 'editor' })

beforeEach(() => {
  comoDueno()
  vistas.clear()
})

beforeAll(async () => {
  comoDueno()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), IdentidadDePrueba, RastroModule, OnboardingModule],
  })
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

describe('estado', () => {
  it('el dueño que no la vio la tiene pendiente, con el libro en que se abrió', async () => {
    const { body } = await pedir.get().expect(200)
    expect(body).toEqual({ pending: true, bookId: LIBRO_DE_PRUEBA.bookId, steps: {} })
  })

  it('un editor nunca la tiene pendiente', async () => {
    comoEditor()
    const { body } = await pedir.get().expect(200)
    expect(body.pending).toBe(false)
  })

  it('empezar la marca, y empezar dos veces da 204 las dos', async () => {
    await pedir.post('/start').expect(204)
    await pedir.post('/start').expect(204)
    const { body } = await pedir.get().expect(200)
    expect(body.pending).toBe(false)
  })

  it('un editor no puede empezarla', async () => {
    comoEditor()
    await pedir.post('/start').expect(403)
  })
})
```

Verificar cómo arman el contexto de libro los otros specs de controlador con `entrarEnLibro`. Si `RastroModule` pide proveedores que el test no tiene, copiar el armado de `budget.controller.spec.ts`. Si el libro `lib_test` no existe en la base del contenedor y la FK de `onboarding_steps` falla, crearlo en `beforeAll` con `prisma.clientSinFiltroDeLibro.book.create(...)`, igual que en la Tarea 3.

- [ ] **Step 9: Correr**

Run: `cd api && npx vitest run src/modules/onboarding`
Expected: PASS (4 tests).

- [ ] **Step 10: Guardias transversales**

Run: `cd api && npx vitest run src/modules/identity/infrastructure/cobertura-de-permisos.spec.ts src/modules/auditoria`
Expected: PASS. Si `cobertura-de-rastro.spec.ts` pide clasificar el módulo nuevo, agregar `onboarding` como excepción, con el motivo «coordina casos de uso que ya dejan rastro o que el ADR-004 excluye».

- [ ] **Step 11: Commit**

```bash
git add api/src/modules/onboarding api/src/modules/accounting/accounting.module.ts api/src/modules/banking/banking.module.ts api/src/modules/budget/budget.module.ts api/src/app.module.ts api/src/modules/auditoria
git commit -m "✨ feat: módulo de bienvenida con estado, marca y pasos idempotentes"
```

---

### Task 6: Paso Bancos

**Files:**
- Create: `api/src/modules/onboarding/application/crear-bancos.use-case.ts`
- Modify: `api/src/modules/onboarding/infrastructure/onboarding.schemas.ts`
- Modify: `api/src/modules/onboarding/infrastructure/onboarding.controller.ts`
- Modify: `api/src/modules/onboarding/onboarding.module.ts`
- Test: `api/src/modules/onboarding/infrastructure/onboarding.controller.spec.ts`

**Interfaces:**
- Consumes: `PasoIdempotente`, `siguienteCodigoLibre`, `SaveAccountUseCase`, `ManageBankAccountsUseCase`, `ACCOUNT_REPOSITORY`.
- Produces: `type BancoCreado = { name: string; currency: Currency; accountCode: string; bankAccountId: string }`; `CrearBancosUseCase.execute(input: BanksInput): Promise<BancoCreado[]>`; `POST /onboarding/banks` → 201 `BancoCreado[]`.

- [ ] **Step 1: Tests**

Agregar al spec:

```ts
describe('bancos', () => {
  const bancos = { banks: [{ name: 'BAC', currency: 'CRC' }, { name: 'BAC', currency: 'USD' }] }

  it('crea una cuenta bajo 1100 y su cuenta bancaria por cada uno', async () => {
    const { body } = await pedir.post('/banks', bancos).expect(201)
    expect(body).toEqual([
      { name: 'BAC colones', currency: 'CRC', accountCode: '1121', bankAccountId: expect.any(String) },
      { name: 'BAC dólares', currency: 'USD', accountCode: '1122', bankAccountId: expect.any(String) },
    ])
    const cuenta = await prisma.client.account.findFirst({ where: { code: '1121' } })
    expect(cuenta).toMatchObject({ parentCode: '1100', accountClass: 'ASSET', name: 'BAC colones' })
  })

  it('repetido devuelve lo mismo y no crea nada nuevo', async () => {
    const primera = await pedir.post('/banks', bancos).expect(201)
    const segunda = await pedir.post('/banks', { banks: [{ name: 'Otro', currency: 'CRC' }] }).expect(201)
    expect(segunda.body).toEqual(primera.body)
    expect(await prisma.client.bankAccount.count()).toBe(2)
  })

  it('si uno falla no queda ninguno ni la anotación del paso', async () => {
    const casoDeUso = app.get(ManageBankAccountsUseCase)
    const original = casoDeUso.create.bind(casoDeUso)
    vi.spyOn(casoDeUso, 'create')
      .mockImplementationOnce(original)
      .mockRejectedValueOnce(new SemanticValidationError('falla a propósito'))
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }, { name: 'BCR', currency: 'CRC' }] }).expect(422)
    expect(await prisma.client.bankAccount.count()).toBe(0)
    expect(await prisma.client.account.count({ where: { code: { in: ['1121', '1122'] } } })).toBe(0)
    expect(await prisma.client.onboardingStep.count()).toBe(0)
  })

  it('un editor recibe 403', async () => {
    comoEditor()
    await pedir.post('/banks', bancos).expect(403)
  })
})
```

Imports del spec que suma esta tarea: `vi` de `vitest`, `ManageBankAccountsUseCase` de `../../banking/application/manage-bank-accounts.use-case.js` y `SemanticValidationError` de `../../../shared/http/api-error.js`. Agregar `vi.restoreAllMocks()` a un `afterEach`.

Entre tests hay que limpiar las tablas: agregar al `beforeEach` un `await limpiar()` que borre, en orden, `onboardingStep`, `bankAccount`, `category`, `journalLine`, `journalEntry`, `budgetIncome` y las cuentas con código `>= '1121'` que no sean de la semilla. Usar `prisma.client` dentro de `withTransaction` (las escrituras exigen transacción).

- [ ] **Step 2: Ver que fallan**

Run: `cd api && npx vitest run src/modules/onboarding`
Expected: FAIL con 404 en `/banks`.

- [ ] **Step 3: Esquema**

```ts
// en onboarding.schemas.ts
import { nameText } from '../../../shared/http/text.schema.js'
import { CURRENCIES } from '../../../shared/kernel/currency.js'

export const banksSchema = z
  .object({ banks: z.array(z.object({ name: nameText, currency: z.enum(CURRENCIES) })).min(1).max(20) })
  .meta({ id: 'OnboardingBanksInput', title: 'OnboardingBanksInput' })

export const bancoCreadoSchema = z
  .object({ name: z.string(), currency: z.enum(CURRENCIES), accountCode: z.string(), bankAccountId: z.string() })
  .meta({ id: 'OnboardingBank', title: 'OnboardingBank' })

export type BanksInput = z.infer<typeof banksSchema>
```

- [ ] **Step 4: Caso de uso**

```ts
// api/src/modules/onboarding/application/crear-bancos.use-case.ts
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import type { Currency } from '../../../shared/kernel/currency.js'
import { SaveAccountUseCase } from '../../accounting/application/save-account.use-case.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../../accounting/domain/account-repository.port.js'
import { siguienteCodigoLibre } from '../../accounting/domain/codigo-libre.js'
import { ManageBankAccountsUseCase } from '../../banking/application/manage-bank-accounts.use-case.js'
import type { BanksInput } from '../infrastructure/onboarding.schemas.js'
import { PasoIdempotente } from './paso-idempotente.js'

export interface BancoCreado {
  name: string
  currency: Currency
  accountCode: string
  bankAccountId: string
}

const EFECTIVO_Y_EQUIVALENTES = '1100'
const PRIMER_BANCO = 1121
const ULTIMO_BANCO = 1189
const EN = { CRC: 'colones', USD: 'dólares' } as const satisfies Record<Currency, string>

@Injectable()
export class CrearBancosUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly cuentas: SaveAccountUseCase,
    private readonly bancos: ManageBankAccountsUseCase,
    @Inject(ACCOUNT_REPOSITORY) private readonly plan: AccountRepository,
  ) {}

  execute({ banks }: BanksInput): Promise<BancoCreado[]> {
    return this.paso.correr('banks', async () => {
      const ocupados = new Set((await this.plan.loadChart()).all().map((cuenta) => cuenta.code))
      const creados: BancoCreado[] = []
      for (const { name, currency } of banks) {
        const codigo = siguienteCodigoLibre(ocupados, PRIMER_BANCO, ULTIMO_BANCO)
        if (isErr(codigo)) throw new SemanticValidationError(codigo.error.message)
        ocupados.add(codigo.value)

        const nombre = `${name} ${EN[currency]}`
        await this.cuentas.create({
          code: codigo.value,
          name: nombre,
          accountClass: 'ASSET',
          parentCode: EFECTIVO_Y_EQUIVALENTES,
          active: true,
          sortOrder: 50 + creados.length,
        })
        const banco = await this.bancos.create({ name: nombre, accountCode: codigo.value, currency, profileId: null, active: true })
        creados.push({ name: nombre, currency, accountCode: codigo.value, bankAccountId: banco.id })
      }
      return creados
    })
  }
}
```

- [ ] **Step 5: Endpoint y proveedor**

En el controlador:

```ts
  @Permiso('bienvenida', 'write')
  @Post('banks')
  banks(@Body(new ZodValidationPipe(banksSchema)) input: BanksInput): Promise<BancoCreado[]> {
    return this.crearBancos.execute(input)
  }
```

Inyectar `private readonly crearBancos: CrearBancosUseCase` en el constructor. Importar `Body` y `ZodValidationPipe` (`../../../shared/http/zod-validation.pipe.js`). Agregar `CrearBancosUseCase` a los `providers` del módulo.

- [ ] **Step 6: Correr**

Run: `cd api && npx vitest run src/modules/onboarding`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/onboarding
git commit -m "✨ feat: la bienvenida crea las cuentas de cada banco"
```

---

### Task 7: Paso Saldos iniciales

**Files:**
- Create: `api/src/modules/onboarding/application/cargar-saldos.use-case.ts`
- Modify: `onboarding.schemas.ts`, `onboarding.controller.ts`, `onboarding.module.ts`
- Test: `onboarding.controller.spec.ts`

**Interfaces:**
- Consumes: `PasoIdempotente`, `CAJAS`, `CreateJournalEntryUseCase`, `ONBOARDING_STEP_REPOSITORY` (lee el resultado de `banks`), `BancoCreado`.
- Produces: `CargarSaldosUseCase.execute(input: OpeningBalancesInput): Promise<{ entries: { currency: Currency; journalEntryId: string }[] }>`; `POST /onboarding/opening-balances` → 201.

- [ ] **Step 1: Tests**

```ts
describe('saldos iniciales', () => {
  const lineas = async (currency: string) =>
    prisma.client.journalLine.findMany({ where: { currency }, select: { accountCode: true, side: true, amountMinor: true } })

  it('un asiento por moneda, contra Aportes, con sobregiro al haber', async () => {
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }, { name: 'BN', currency: 'CRC' }] }).expect(201)
    const { body } = await pedir
      .post('/opening-balances', {
        date: '2026-09-25',
        balances: [
          { accountCode: '1101', amount: '50000' },
          { accountCode: '1121', amount: '300000' },
          { accountCode: '1122', amount: '-20000' },
        ],
      })
      .expect(201)
    expect(body.entries).toHaveLength(1)
    expect(await lineas('CRC')).toEqual(
      expect.arrayContaining([
        { accountCode: '1101', side: 'DEBIT', amountMinor: 50000n },
        { accountCode: '1121', side: 'DEBIT', amountMinor: 300000n },
        { accountCode: '1122', side: 'CREDIT', amountMinor: 20000n },
        { accountCode: '3110', side: 'CREDIT', amountMinor: 330000n },
      ]),
    )
  })

  it('una caja en negativo da 422', async () => {
    await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '-1' }] }).expect(422)
  })

  it('neto cero no lleva contrapartida', async () => {
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }] }).expect(201)
    await pedir
      .post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '100' }, { accountCode: '1121', amount: '-100' }] })
      .expect(201)
    expect((await lineas('CRC')).map((linea) => linea.accountCode).sort()).toEqual(['1101', '1121'])
  })

  it('los ceros se ignoran y sin nada que asentar no hay asientos', async () => {
    const { body } = await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '0' }] }).expect(201)
    expect(body.entries).toEqual([])
  })

  it('una cuenta que no es caja ni banco de la bienvenida da 422', async () => {
    await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1111', amount: '5' }] }).expect(422)
  })

  it('una cuenta repetida en el pedido da 400', async () => {
    await pedir
      .post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '5' }, { accountCode: '1101', amount: '6' }] })
      .expect(400)
  })

  it('repetido no duplica el asiento', async () => {
    const pedido = { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '5' }] }
    const primera = await pedir.post('/opening-balances', pedido).expect(201)
    const segunda = await pedir.post('/opening-balances', pedido).expect(201)
    expect(segunda.body).toEqual(primera.body)
    expect(await prisma.client.journalEntry.count()).toBe(1)
  })
})
```

Los nombres de columna de `journalLine` (`amountMinor`, `currency`, `side`) salen del esquema: ajustar el `select` si difieren. Los montos viajan como enteros en unidades mínimas, en string.

- [ ] **Step 2: Ver que fallan**

Run: `cd api && npx vitest run src/modules/onboarding -t "saldos"`
Expected: FAIL con 404.

- [ ] **Step 3: Esquema**

```ts
const montoConSigno = z.string().regex(/^-?\d{1,15}$/, { error: 'El monto debe ser un entero en unidades mínimas' })

export const openingBalancesSchema = z
  .object({
    date: isoDate,
    balances: z
      .array(z.object({ accountCode: z.string().regex(/^\d{3,10}$/), amount: montoConSigno }))
      .max(100)
      .refine((saldos) => new Set(saldos.map((saldo) => saldo.accountCode)).size === saldos.length, {
        error: 'Cada cuenta va una sola vez',
      }),
  })
  .meta({ id: 'OpeningBalancesInput', title: 'OpeningBalancesInput' })

export const openingBalancesResponseSchema = z
  .object({ entries: z.array(z.object({ currency: z.enum(CURRENCIES), journalEntryId: z.string() })) })
  .meta({ id: 'OpeningBalancesResult', title: 'OpeningBalancesResult' })

export type OpeningBalancesInput = z.infer<typeof openingBalancesSchema>
```

Importar `isoDate` de `../../../shared/http/date.schema.js`. Quince dígitos quedan por debajo de `MAX_MINOR_UNITS`.

- [ ] **Step 4: Caso de uso**

```ts
// api/src/modules/onboarding/application/cargar-saldos.use-case.ts
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import type { Currency } from '../../../shared/kernel/currency.js'
import { CreateJournalEntryUseCase } from '../../accounting/application/create-journal-entry.use-case.js'
import { CAJAS } from '../../accounting/infrastructure/cajas.js'
import { ONBOARDING_STEP_REPOSITORY, type OnboardingStepRepository } from '../domain/onboarding-step-repository.port.js'
import type { OpeningBalancesInput } from '../infrastructure/onboarding.schemas.js'
import type { BancoCreado } from './crear-bancos.use-case.js'
import { PasoIdempotente } from './paso-idempotente.js'

const APORTES = '3110'

type Lado = 'DEBIT' | 'CREDIT'
interface Linea {
  accountCode: string
  amount: { minorUnits: string; currency: Currency }
  side: Lado
}

export interface SaldosCargados {
  entries: { currency: Currency; journalEntryId: string }[]
}

const linea = (accountCode: string, monto: bigint, currency: Currency, positivo: Lado, negativo: Lado): Linea => ({
  accountCode,
  amount: { minorUnits: (monto < 0n ? -monto : monto).toString(), currency },
  side: monto < 0n ? negativo : positivo,
})

@Injectable()
export class CargarSaldosUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly asientos: CreateJournalEntryUseCase,
    @Inject(ONBOARDING_STEP_REPOSITORY) private readonly pasos: OnboardingStepRepository,
  ) {}

  execute({ date, balances }: OpeningBalancesInput): Promise<SaldosCargados> {
    return this.paso.correr('opening-balances', async () => {
      const monedas = await this.monedasPermitidas()
      const porMoneda = new Map<Currency, Linea[]>()
      const netos = new Map<Currency, bigint>()

      for (const { accountCode, amount } of balances) {
        const monto = BigInt(amount)
        if (monto === 0n) continue
        const currency = monedas.get(accountCode)
        if (!currency) throw new SemanticValidationError(`La cuenta ${accountCode} no es una caja ni un banco de la bienvenida.`)
        // Una caja no se sobregira: un negativo ahí es un error de tipeo, no un saldo.
        if (monto < 0n && accountCode in CAJAS) throw new SemanticValidationError('El efectivo no puede quedar en negativo.')

        porMoneda.set(currency, [...(porMoneda.get(currency) ?? []), linea(accountCode, monto, currency, 'DEBIT', 'CREDIT')])
        netos.set(currency, (netos.get(currency) ?? 0n) + monto)
      }

      const entries: SaldosCargados['entries'] = []
      for (const [currency, lineas] of porMoneda) {
        const neto = netos.get(currency) ?? 0n
        // Con neto cero Aportes no se mueve, y una línea en cero la rechaza el asiento.
        const contrapartida = neto === 0n ? [] : [linea(APORTES, neto, currency, 'CREDIT', 'DEBIT')]
        const asiento = await this.asientos.execute({
          date,
          description: 'Saldos iniciales',
          reference: null,
          lines: [...lineas, ...contrapartida],
        })
        entries.push({ currency, journalEntryId: asiento.id })
      }
      return { entries }
    })
  }

  // Las cajas de la semilla y los bancos que creó la bienvenida en este libro, con su moneda.
  private async monedasPermitidas(): Promise<Map<string, Currency>> {
    const bancos = ((await this.pasos.find('banks')) ?? []) as BancoCreado[]
    return new Map<string, Currency>([
      ...(Object.entries(CAJAS) as [string, Currency][]),
      ...bancos.map((banco): [string, Currency] => [banco.accountCode, banco.currency]),
    ])
  }
}
```

Un solo asiento con una sola línea no alcanza el mínimo de 2 líneas del esquema. Ese caso no se da: con una sola cuenta distinta de cero, el neto nunca es cero y siempre hay contrapartida. Hay que confirmar que `CreateJournalEntryUseCase.execute` recibe el `CreateJournalEntryInput` ya parseado (`reference` en `null` sin default). Si exige otra forma, construirla con `createJournalEntrySchema.parse(...)`.

- [ ] **Step 5: Endpoint y proveedor**

```ts
  @Permiso('bienvenida', 'write')
  @Post('opening-balances')
  openingBalances(@Body(new ZodValidationPipe(openingBalancesSchema)) input: OpeningBalancesInput): Promise<SaldosCargados> {
    return this.cargarSaldos.execute(input)
  }
```

Inyectar `CargarSaldosUseCase` y agregarlo a `providers`.

- [ ] **Step 6: Correr**

Run: `cd api && npx vitest run src/modules/onboarding`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/onboarding
git commit -m "✨ feat: la bienvenida carga los saldos de hoy con un asiento de apertura"
```

---

### Task 8: Paso Categorías

**Files:**
- Create: `api/src/modules/onboarding/application/crear-categorias.use-case.ts`
- Modify: `onboarding.schemas.ts`, `onboarding.controller.ts`, `onboarding.module.ts`
- Test: `onboarding.controller.spec.ts`

**Interfaces:**
- Consumes: `PasoIdempotente`, `siguienteCodigoLibre`, `SaveAccountUseCase`, `ManageCategoriesUseCase`, `ACCOUNT_REPOSITORY`.
- Produces: `type CategoriaCreada = { name: string; kind: 'EXPENSE' | 'INCOME'; accountCode: string; categoryId: string }`; `POST /onboarding/categories` → 201 `CategoriaCreada[]`.

- [ ] **Step 1: Tests**

```ts
describe('categorías', () => {
  it('cada una con su cuenta bajo la agrupadora de su tipo', async () => {
    const { body } = await pedir
      .post('/categories', { categories: [{ name: 'Supermercado', kind: 'EXPENSE' }, { name: 'Casa', kind: 'EXPENSE' }, { name: 'Salario', kind: 'INCOME' }] })
      .expect(201)
    expect(body).toEqual([
      { name: 'Supermercado', kind: 'EXPENSE', accountCode: '6201', categoryId: expect.any(String) },
      { name: 'Casa', kind: 'EXPENSE', accountCode: '6202', categoryId: expect.any(String) },
      { name: 'Salario', kind: 'INCOME', accountCode: '4201', categoryId: expect.any(String) },
    ])
    expect(await prisma.client.account.findFirst({ where: { code: '6200' } })).toMatchObject({ parentCode: '6000', accountClass: 'OPERATING_EXPENSE' })
    expect(await prisma.client.account.findFirst({ where: { code: '6201' } })).toMatchObject({ parentCode: '6200', name: 'Supermercado' })
    expect(await prisma.client.category.findFirst({ where: { name: 'Salario' } })).toMatchObject({ kind: 'INCOME', accountCode: '4201' })
  })

  it('un nombre repetido en el pedido, sin importar mayúsculas ni espacios, da 409 y no crea nada', async () => {
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }, { name: ' casa ', kind: 'EXPENSE' }] }).expect(409)
    expect(await prisma.client.category.count()).toBe(0)
  })

  it('un nombre que ya existe en el libro da 409', async () => {
    await prisma.withTransaction(() =>
      prisma.client.category.create({ data: { id: 'c1', bookId: LIBRO_DE_PRUEBA.bookId, name: 'Casa', kind: 'EXPENSE', sortOrder: 0, active: true } }),
    )
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }).expect(409)
  })

  it('si 6200 ya existe y acepta asientos, 422', async () => {
    await prisma.withTransaction(() =>
      prisma.client.account.create({ data: { bookId: LIBRO_DE_PRUEBA.bookId, code: '6200', name: 'Mía', accountClass: 'OPERATING_EXPENSE', parentCode: '6000' } }),
    )
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }).expect(422)
  })

  it('repetido devuelve lo mismo', async () => {
    const pedido = { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }
    const primera = await pedir.post('/categories', pedido).expect(201)
    const segunda = await pedir.post('/categories', pedido).expect(201)
    expect(segunda.body).toEqual(primera.body)
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `cd api && npx vitest run src/modules/onboarding -t "categorías"`
Expected: FAIL con 404.

- [ ] **Step 3: Esquema**

```ts
export const categoriesSchema = z
  .object({ categories: z.array(z.object({ name: nameText, kind: z.enum(['EXPENSE', 'INCOME']) })).min(1).max(60) })
  .meta({ id: 'OnboardingCategoriesInput', title: 'OnboardingCategoriesInput' })

export const categoriaCreadaSchema = z
  .object({ name: z.string(), kind: z.enum(['EXPENSE', 'INCOME']), accountCode: z.string(), categoryId: z.string() })
  .meta({ id: 'OnboardingCategory', title: 'OnboardingCategory' })

export type CategoriesInput = z.infer<typeof categoriesSchema>
```

- [ ] **Step 4: Caso de uso**

```ts
// api/src/modules/onboarding/application/crear-categorias.use-case.ts
import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ManageCategoriesUseCase } from '../../accounting/application/manage-categories.use-case.js'
import { SaveAccountUseCase } from '../../accounting/application/save-account.use-case.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../../accounting/domain/account-repository.port.js'
import type { ChartOfAccounts } from '../../accounting/domain/chart-of-accounts.js'
import { siguienteCodigoLibre } from '../../accounting/domain/codigo-libre.js'
import type { CategoriesInput } from '../infrastructure/onboarding.schemas.js'
import { PasoIdempotente } from './paso-idempotente.js'

type Tipo = 'EXPENSE' | 'INCOME'

export interface CategoriaCreada {
  name: string
  kind: Tipo
  accountCode: string
  categoryId: string
}

// Cada tipo cuelga de una agrupadora propia y no de «Gastos generales»: así el estado de
// resultados sale desglosado por categoría, y la cuenta de la semilla queda como estaba.
const AGRUPADORAS = {
  EXPENSE: { code: '6200', name: 'Gastos por categoría', parentCode: '6000', accountClass: 'OPERATING_EXPENSE', desde: 6201, hasta: 6299 },
  INCOME: { code: '4200', name: 'Ingresos por categoría', parentCode: '4000', accountClass: 'INCOME', desde: 4201, hasta: 4299 },
} as const satisfies Record<Tipo, { code: string; name: string; parentCode: string; accountClass: string; desde: number; hasta: number }>

const clave = (name: string, kind: Tipo) => `${kind}:${name.trim().toLocaleLowerCase('es')}`

@Injectable()
export class CrearCategoriasUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly cuentas: SaveAccountUseCase,
    private readonly categorias: ManageCategoriesUseCase,
    @Inject(ACCOUNT_REPOSITORY) private readonly plan: AccountRepository,
  ) {}

  execute({ categories }: CategoriesInput): Promise<CategoriaCreada[]> {
    return this.paso.correr('categories', async () => {
      await this.rechazarRepetidas(categories)
      const chart = await this.plan.loadChart()
      const ocupados = new Set(chart.all().map((cuenta) => cuenta.code))

      for (const kind of new Set(categories.map((categoria) => categoria.kind))) {
        await this.asegurarAgrupadora(kind, chart, ocupados)
      }

      const creadas: CategoriaCreada[] = []
      for (const [orden, { name, kind }] of categories.entries()) {
        const { code: madre, accountClass, desde, hasta } = AGRUPADORAS[kind]
        const codigo = siguienteCodigoLibre(ocupados, desde, hasta)
        if (isErr(codigo)) throw new SemanticValidationError(codigo.error.message)
        ocupados.add(codigo.value)

        await this.cuentas.create({ code: codigo.value, name: name.trim(), accountClass, parentCode: madre, active: true, sortOrder: orden })
        const categoria = await this.categorias.create({
          name: name.trim(),
          kind,
          accountCode: codigo.value,
          sortOrder: orden,
          active: true,
          colorIndex: null,
        })
        creadas.push({ name: categoria.name, kind, accountCode: codigo.value, categoryId: categoria.id })
      }
      return creadas
    })
  }

  // Antes de escribir nada: la base también lo rechazaría, pero a mitad del paso y con un error
  // que no dice cuál.
  private async rechazarRepetidas(categories: CategoriesInput['categories']): Promise<void> {
    const vistas = new Set((await this.categorias.list()).map((categoria) => clave(categoria.name, categoria.kind)))
    for (const { name, kind } of categories) {
      const suya = clave(name, kind)
      if (vistas.has(suya)) throw new ConflictError(`Ya hay una categoría «${name.trim()}».`)
      vistas.add(suya)
    }
  }

  private async asegurarAgrupadora(kind: Tipo, chart: ChartOfAccounts, ocupados: Set<string>): Promise<void> {
    const { code, name, parentCode, accountClass } = AGRUPADORAS[kind]
    if (!ocupados.has(code)) {
      await this.cuentas.create({ code, name, accountClass, parentCode, active: true, sortOrder: 20 })
      ocupados.add(code)
      return
    }
    // Colgarle hijas a una cuenta que ya acepta asientos la vuelve agrupadora sin avisar, y las
    // categorías que apuntan a ella dejan de poder asentarse.
    if (chart.isPostable(code)) {
      throw new SemanticValidationError(`La cuenta ${code} ya existe y acepta asientos: no se le pueden colgar categorías.`)
    }
  }
}
```

Hay que verificar que `Category` expone `kind` (sí, `category.ts:36`) y que `ManageCategoriesUseCase.list()` devuelve `Category[]`. `accountClass` de `AGRUPADORAS` tiene que tipar como `AccountClass`: si `as const` no alcanza, anotar el objeto con `Record<Tipo, { ...; accountClass: AccountClass; ... }>` importando `AccountClass` de `../../accounting/domain/account-class.js`.

- [ ] **Step 5: Endpoint y proveedor**

```ts
  @Permiso('bienvenida', 'write')
  @Post('categories')
  categories(@Body(new ZodValidationPipe(categoriesSchema)) input: CategoriesInput): Promise<CategoriaCreada[]> {
    return this.crearCategorias.execute(input)
  }
```

- [ ] **Step 6: Correr**

Run: `cd api && npx vitest run src/modules/onboarding`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/onboarding
git commit -m "✨ feat: la bienvenida crea categorías con cuenta propia"
```

---

### Task 9: Paso Ingreso, OpenAPI y tipos del cliente

**Files:**
- Create: `api/src/modules/onboarding/application/declarar-ingreso-inicial.use-case.ts`
- Create: `api/src/modules/onboarding/infrastructure/onboarding.openapi.ts`
- Modify: `onboarding.schemas.ts`, `onboarding.controller.ts`, `onboarding.module.ts`, `api/src/shared/http/openapi.document.ts`
- Modify (generado): `web/src/lib/api-types.gen.ts`
- Test: `onboarding.controller.spec.ts`

**Interfaces:**
- Consumes: `PasoIdempotente`, `DeclararIngresoUseCase`, `PeriodKey`.
- Produces: `POST /onboarding/income` `{ month: 'AAAA-MM', amount: Money }` → 201 `{ month, amount }`; esquemas OpenAPI `OnboardingStatus`, `OnboardingBanksInput`, `OnboardingBank`, `OpeningBalancesInput`, `OpeningBalancesResult`, `OnboardingCategoriesInput`, `OnboardingCategory`, `OnboardingIncomeInput`, `OnboardingIncome`.

- [ ] **Step 1: Tests**

```ts
describe('ingreso', () => {
  it('declara el ingreso del mes y repetido devuelve lo mismo', async () => {
    const pedido = { month: '2026-09', amount: { minorUnits: '85000000', currency: 'CRC' } }
    const primera = await pedir.post('/income', pedido).expect(201)
    expect(primera.body).toEqual(pedido)
    const segunda = await pedir.post('/income', { ...pedido, amount: { minorUnits: '1', currency: 'CRC' } }).expect(201)
    expect(segunda.body).toEqual(pedido)
  })

  it('un mes con otra forma da 422', async () => {
    await pedir.post('/income', { month: '2026-13', amount: { minorUnits: '1', currency: 'CRC' } }).expect(422)
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `cd api && npx vitest run src/modules/onboarding -t "ingreso"`
Expected: FAIL con 404.

- [ ] **Step 3: Esquema y caso de uso**

```ts
// en onboarding.schemas.ts
import { nonNegativeMoneySchema, moneySchema } from '../../../shared/http/money.schema.js'
import { periodParam } from '../../../shared/http/date.schema.js'

export const incomeSchema = z
  .object({ month: periodParam, amount: nonNegativeMoneySchema })
  .meta({ id: 'OnboardingIncomeInput', title: 'OnboardingIncomeInput' })

export const incomeResponseSchema = z
  .object({ month: z.string(), amount: moneySchema })
  .meta({ id: 'OnboardingIncome', title: 'OnboardingIncome' })

export type IncomeInput = z.infer<typeof incomeSchema>
```

Si `periodParam` ya valida el mes y da 400 con `2026-13`, cambiar la expectativa del segundo test a 400.

```ts
// api/src/modules/onboarding/application/declarar-ingreso-inicial.use-case.ts
import { Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import { DeclararIngresoUseCase } from '../../budget/application/declarar-ingreso.use-case.js'
import type { IncomeInput } from '../infrastructure/onboarding.schemas.js'
import { PasoIdempotente } from './paso-idempotente.js'

@Injectable()
export class DeclararIngresoInicialUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly ingreso: DeclararIngresoUseCase,
  ) {}

  // `null` como versión: se vio el mes sin ingreso. Si alguien lo declaró en el medio, 409.
  execute(input: IncomeInput): Promise<IncomeInput> {
    return this.paso.correr('income', async () => {
      const period = PeriodKey.parse(input.month)
      if (isErr(period)) throw new SemanticValidationError(period.error.message)
      await this.ingreso.execute({ period: period.value, amount: toMoney(input.amount) }, null)
      return input
    })
  }
}
```

- [ ] **Step 4: Endpoint y proveedor**

```ts
  @Permiso('bienvenida', 'write')
  @Post('income')
  income(@Body(new ZodValidationPipe(incomeSchema)) input: IncomeInput): Promise<IncomeInput> {
    return this.declararIngreso.execute(input)
  }
```

- [ ] **Step 5: OpenAPI**

```ts
// api/src/modules/onboarding/infrastructure/onboarding.openapi.ts
import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { z } from 'zod'
import {
  bancoCreadoSchema,
  banksSchema,
  categoriaCreadaSchema,
  categoriesSchema,
  incomeResponseSchema,
  incomeSchema,
  onboardingStatusResponseSchema,
  openingBalancesResponseSchema,
  openingBalancesSchema,
} from './onboarding.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const onboardingOpenApiPaths: ZodOpenApiPathsObject = {
  '/onboarding': {
    get: {
      summary: 'Si la bienvenida está pendiente, en qué libro y qué pasos ya se hicieron',
      responses: { 200: { description: 'Estado de la bienvenida', ...json(onboardingStatusResponseSchema) } },
    },
  },
  '/onboarding/start': {
    post: { summary: 'Marca la bienvenida como vista: se muestra una sola vez', responses: { 204: { description: 'Marcada' } } },
  },
  '/onboarding/banks': {
    post: {
      summary: 'Crea la cuenta contable y la cuenta bancaria de cada banco',
      requestBody: json(banksSchema),
      responses: { 201: { description: 'Bancos creados', ...json(z.array(bancoCreadoSchema)) }, 422: { description: 'Regla del plan de cuentas' } },
    },
  },
  '/onboarding/opening-balances': {
    post: {
      summary: 'Asienta los saldos de hoy contra Aportes, un asiento por moneda',
      requestBody: json(openingBalancesSchema),
      responses: { 201: { description: 'Asientos de apertura', ...json(openingBalancesResponseSchema) }, 422: { description: 'Cuenta o monto no válidos' } },
    },
  },
  '/onboarding/categories': {
    post: {
      summary: 'Crea cada categoría con su propia cuenta',
      requestBody: json(categoriesSchema),
      responses: { 201: { description: 'Categorías creadas', ...json(z.array(categoriaCreadaSchema)) }, 409: { description: 'Nombre repetido' } },
    },
  },
  '/onboarding/income': {
    post: {
      summary: 'Declara el ingreso del mes',
      requestBody: json(incomeSchema),
      responses: { 201: { description: 'Ingreso declarado', ...json(incomeResponseSchema) } },
    },
  },
}
```

En `openapi.document.ts`, importar `onboardingOpenApiPaths` y agregarlo a `paths` después de `libroOpenApiPaths`.

- [ ] **Step 6: Tipos del cliente**

Run: `cd web && npm run api:types`
Expected: `web/src/lib/api-types.gen.ts` con los esquemas `Onboarding*`.

- [ ] **Step 7: Correr la api entera de onboarding y la tarea**

Run: `cd api && npx vitest run src/modules/onboarding src/shared/http` y después, en la raíz, `npm run check:task`.
Expected: PASS. Cobertura de lo nuevo ≥ 80 %.

- [ ] **Step 8: Commit**

```bash
git add api/src/modules/onboarding api/src/shared/http/openapi.document.ts web/src/lib/api-types.gen.ts
git commit -m "✨ feat: la bienvenida declara el ingreso del mes y documenta sus endpoints"
```

---

### Task 10: Web — datos, copy y Nimbo con burbuja

**Files:**
- Create: `web/src/features/onboarding/types.ts`
- Create: `web/src/features/onboarding/copy.ts`
- Create: `web/src/features/onboarding/use-onboarding.ts`
- Create: `web/src/features/onboarding/nimbo-dice.tsx`
- Create: `web/src/features/onboarding/nimbo-dice.spec.tsx`
- Modify: `web/src/lib/query-keys.ts`

**Interfaces:**
- Consumes: esquemas `Onboarding*` de `api-types.gen.ts` (Tarea 9); `Bloub` y `NombreDeGesto` de `features/shell/bloub.tsx`.
- Produces:
  - Tipos: `OnboardingStatus`, `BancoCreado`, `CategoriaCreada`, `SaldosCargados`, `IngresoDeclarado`.
  - `useOnboardingStatus()`: `UseQueryResult<OnboardingStatus>`.
  - `useEmpezarBienvenida()`, `usePasoDeBienvenida<I, R>(bookId: string, path: string)`: `UseMutationResult<R, Error, I>`.
  - `<NimboDice gesto={NombreDeGesto} id={string}>{texto}</NimboDice>`.
  - `copy`, con claves por paso.

- [ ] **Step 1: Tipos y clave de consulta**

```ts
// web/src/features/onboarding/types.ts
import type { components } from '@/lib/api-types.gen'

export type OnboardingStatus = components['schemas']['OnboardingStatus']
export type BancoCreado = components['schemas']['OnboardingBank']
export type CategoriaCreada = components['schemas']['OnboardingCategory']
export type SaldosCargados = components['schemas']['OpeningBalancesResult']
export type IngresoDeclarado = components['schemas']['OnboardingIncome']
export type Moneda = BancoCreado['currency']
```

En `query-keys.ts`, dentro de `queryKeys`:

```ts
  onboarding: { status: () => ['onboarding', 'status'] as const },
```

- [ ] **Step 2: Hooks**

```ts
// web/src/features/onboarding/use-onboarding.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { OnboardingStatus } from './types'

// La cabecera va a mano: el modal queda atado al libro en que se abrió, aunque en otra pestaña
// se cambie el activo.
const enElLibro = (bookId: string) => ({ 'x-libro': bookId })

export const useOnboardingStatus = () =>
  useQuery({
    queryKey: queryKeys.onboarding.status(),
    queryFn: () => apiFetch<OnboardingStatus>('/onboarding'),
    staleTime: Infinity,
  })

// Sin esperar la respuesta ni avisar si falla: el modal ya está abierto, y lo peor que pasa es
// que la próxima vez vuelva a aparecer.
export const useEmpezarBienvenida = () =>
  useMutation({
    mutationFn: (bookId: string) => apiFetch<void>('/onboarding/start', { method: 'POST', headers: enElLibro(bookId) }),
  })

export const usePasoDeBienvenida = <Entrada, Resultado>(bookId: string, path: string) => {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (entrada: Entrada) =>
      apiFetch<Resultado>(`/onboarding/${path}`, { method: 'POST', body: JSON.stringify(entrada), headers: enElLibro(bookId) }),
    // Lo que se creó aparece en sus pantallas: plan, categorías, bancos, presupuesto.
    onSuccess: () => cliente.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'onboarding' }),
  })
}
```

`apiFetch` mezcla `init.headers` después de los suyos, así que `x-libro` llega. Hay que confirmarlo en `lib/api.ts:69`.

- [ ] **Step 3: Copy**

```ts
// web/src/features/onboarding/copy.ts
// Tono de PRODUCT.md: directo, sin felicitar de más. Nimbo habla en segunda persona y en voseo.
export const copy = {
  title: 'Bienvenida',
  pasoDe: (actual: number, total: number) => `Paso ${actual} de ${total}`,
  botones: { siguiente: 'Siguiente', saltear: 'Saltear', atras: 'Atrás', reintentar: 'Reintentar', empezar: 'Empezar', cerrar: 'Cerrar' },
  cerrar: {
    title: '¿Cerrar la bienvenida?',
    description: 'Lo que ya confirmaste queda. La bienvenida no vuelve a aparecer.',
    confirmar: 'Cerrar',
    seguir: 'Seguir',
  },
  hecho: 'Hecho',
  intro: {
    title: 'Soy Nimbo',
    nimbo: 'Te ayudo a dejar el libro listo en cinco pasos: tus monedas, tus bancos, lo que tenés hoy, en qué gastás y cuánto entra este mes. Cualquiera se puede saltear.',
  },
  monedas: {
    title: 'Monedas',
    nimbo: '¿Manejás dólares o solo colones?',
    soloColones: 'Solo colones',
    ambas: 'Colones y dólares',
  },
  bancos: {
    title: 'Bancos',
    nimbo: 'Cada banco que uses es una cuenta. Contra ella vas a conciliar el estado de cuenta.',
    sugeridos: ['BAC Credomatic', 'BCR', 'BN', 'Promerica', 'Davivienda', 'Banco Popular'],
    otro: 'Otro banco',
    otroPlaceholder: 'Nombre del banco',
    agregar: 'Agregar',
    moneda: { CRC: 'Colones', USD: 'Dólares' },
    vacio: 'Elegí al menos un banco, o salteá el paso.',
  },
  saldos: {
    title: 'Saldos de hoy',
    nimbo: 'Pasame el saldo de hoy, tal cual lo dice el banco. Si una cuenta está sobregirada, ponelo en negativo.',
    caja: { CRC: 'Efectivo en colones', USD: 'Efectivo en dólares' },
    sinBancos: 'Sin bancos creados, solo se carga el efectivo.',
  },
  categorias: {
    title: 'Categorías',
    nimbo: 'Cada categoría es una cuenta, así los reportes te dicen en qué se fue la plata. Desmarcá las que no usás.',
    gasto: 'Gastos',
    ingreso: 'Ingresos',
    sugeridas: {
      EXPENSE: ['Supermercado', 'Casa', 'Servicios', 'Transporte', 'Salud', 'Comidas afuera', 'Entretenimiento', 'Suscripciones', 'Educación'],
      INCOME: ['Salario', 'Otros ingresos'],
    },
    propia: 'Agregar una propia',
    propiaPlaceholder: 'Nombre',
    tipo: { EXPENSE: 'Gasto', INCOME: 'Ingreso' },
  },
  ingreso: {
    title: 'Ingreso del mes',
    nimbo: '¿Cuánto entra este mes? Con eso se mide el presupuesto. El reparto lo armás después, en Modelos.',
    label: 'Ingreso de este mes',
  },
  cierre: {
    title: 'Listo',
    nimbo: 'Tu libro quedó armado. Si querés saber qué hace cada pantalla, la guía lo cuenta.',
    resumen: {
      bancos: (n: number) => (n === 1 ? '1 banco' : `${n} bancos`),
      categorias: (n: number) => (n === 1 ? '1 categoría' : `${n} categorías`),
      saldos: 'Saldos de hoy cargados',
      ingreso: 'Ingreso del mes declarado',
      nada: 'No cargaste nada todavía: todo se puede hacer desde su pantalla.',
    },
    guia: 'Leer la guía',
    modelos: 'Armar el reparto',
  },
} as const
```

- [ ] **Step 4: Test de `NimboDice`**

```tsx
// web/src/features/onboarding/nimbo-dice.spec.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NimboDice } from './nimbo-dice'

describe('NimboDice', () => {
  it('muestra lo que dice con un id para describir el paso', () => {
    render(<NimboDice gesto="contento" id="dice-intro">Hola</NimboDice>)
    expect(screen.getByText('Hola')).toHaveAttribute('id', 'dice-intro')
  })

  it('Nimbo es decorativo: no se anuncia', () => {
    const { container } = render(<NimboDice gesto="neutro" id="x">Algo</NimboDice>)
    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
```

- [ ] **Step 5: Ver que falla**

Run: `cd web && npx vitest run src/features/onboarding/nimbo-dice.spec.tsx`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 6: Implementar**

```tsx
// web/src/features/onboarding/nimbo-dice.tsx
import type { ReactNode } from 'react'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'

interface Props {
  gesto: NombreDeGesto
  id: string
  children: ReactNode
}

// Nimbo a la izquierda y lo que dice en una burbuja con la punta hacia él. En el teléfono va
// arriba y más chico, para dejarle el ancho al texto. La cara no dice nada que la burbuja no
// diga, así que para el lector de pantalla no existe.
export const NimboDice = ({ gesto, id, children }: Props) => (
  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
    <div aria-hidden="true" className="w-16 shrink-0 sm:w-20">
      <Bloub gesto={gesto} className="h-auto w-full" />
    </div>
    <p
      id={id}
      className="relative rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground before:absolute before:top-5 before:-left-1.5 before:hidden before:size-3 before:rotate-45 before:border-b before:border-l before:border-border before:bg-muted sm:before:block"
    >
      {children}
    </p>
  </div>
)
```

- [ ] **Step 7: Correr**

Run: `cd web && npx vitest run src/features/onboarding`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/features/onboarding web/src/lib/query-keys.ts
git commit -m "✨ feat: Nimbo con burbuja y los datos de la bienvenida"
```

---

### Task 11: Web — los pasos

**Files:**
- Create: `web/src/features/onboarding/pasos/intro.tsx`, `monedas.tsx`, `bancos.tsx`, `saldos.tsx`, `categorias.tsx`, `ingreso.tsx`, `cierre.tsx`
- Create: `web/src/features/onboarding/pasos/pasos.spec.tsx`

**Interfaces:**
- Consumes: `copy`, tipos de `types.ts`, `parseMoneyInput` de `@/lib/money`.
- Produces: todos los pasos tienen la misma forma de props, porque el modal los orquesta igual:

```ts
// Cada paso con datos arma su pedido y lo entrega; el modal decide cuándo mandarlo.
export interface PasoProps<Pedido, Hecho> {
  hecho: Hecho | undefined        // el resultado guardado: si está, el paso se muestra en solo lectura
  onListo: (pedido: Pedido | null) => void  // null = nada para mandar (equivale a saltear)
}
```

  - `Monedas`: `{ valor: 'CRC' | 'CRC+USD'; onCambio(v) }`, sin pedido.
  - `Bancos`: `PasoProps<{ banks: { name: string; currency: Moneda }[] }, BancoCreado[]> & { monedas: Moneda[] }`.
  - `Saldos`: `PasoProps<{ date: string; balances: { accountCode: string; amount: string }[] }, SaldosCargados> & { monedas: Moneda[]; bancos: BancoCreado[] }`.
  - `Categorias`: `PasoProps<{ categories: { name: string; kind: 'EXPENSE' | 'INCOME' }[] }, CategoriaCreada[]>`.
  - `Ingreso`: `PasoProps<{ month: string; amount: { minorUnits: string; currency: 'CRC' } }, IngresoDeclarado>`.
  - `Cierre`: `{ resumen: { bancos: number; categorias: number; saldos: boolean; ingreso: boolean } }`. Los botones a la guía y a Modelos los pone el pie del modal.

  Cada paso con datos expone un `<form id={FORM_ID}>` con `onSubmit` que arma el pedido y llama `onListo`. El botón «Siguiente» del modal es `type="submit" form={FORM_ID}`. Así el paso no conoce la red y el modal no conoce los campos. `FORM_ID = 'paso-de-bienvenida'` se exporta desde `pasos/intro.tsx`, que es el primero en importarse.

- [ ] **Step 1: Tests de los pasos**

```tsx
// web/src/features/onboarding/pasos/pasos.spec.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { copy } from '../copy'
import { Bancos } from './bancos'
import { Categorias } from './categorias'
import { FORM_ID } from './intro'
import { Saldos } from './saldos'

const enviar = () => fireEvent.submit(document.getElementById(FORM_ID) as HTMLFormElement)

describe('Bancos', () => {
  it('con solo colones no ofrece dólares', () => {
    render(<Bancos hecho={undefined} onListo={vi.fn()} monedas={['CRC']} />)
    expect(screen.queryByRole('checkbox', { name: new RegExp(copy.bancos.moneda.USD) })).toBeNull()
  })

  it('arma el pedido con los bancos marcados en cada moneda', () => {
    const onListo = vi.fn()
    render(<Bancos hecho={undefined} onListo={onListo} monedas={['CRC', 'USD']} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'BAC Credomatic · Colones' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'BAC Credomatic · Dólares' }))
    enviar()
    expect(onListo).toHaveBeenCalledWith({
      banks: [
        { name: 'BAC Credomatic', currency: 'CRC' },
        { name: 'BAC Credomatic', currency: 'USD' },
      ],
    })
  })

  it('con el paso hecho muestra lo creado y no deja editar', () => {
    render(<Bancos hecho={[{ name: 'BN colones', currency: 'CRC', accountCode: '1121', bankAccountId: 'b1' }]} onListo={vi.fn()} monedas={['CRC']} />)
    expect(screen.getByText('BN colones')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})

describe('Saldos', () => {
  it('manda los montos en unidades mínimas y omite los vacíos', () => {
    const onListo = vi.fn()
    render(
      <Saldos
        hecho={undefined}
        onListo={onListo}
        monedas={['CRC']}
        bancos={[{ name: 'BAC colones', currency: 'CRC', accountCode: '1121', bankAccountId: 'b1' }]}
      />,
    )
    fireEvent.change(screen.getByLabelText('BAC colones'), { target: { value: '-1500' } })
    enviar()
    expect(onListo).toHaveBeenCalledWith({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      balances: [{ accountCode: '1121', amount: '-150000' }],
    })
  })
})

describe('Categorias', () => {
  it('trae las sugeridas marcadas y suma las propias', () => {
    const onListo = vi.fn()
    render(<Categorias hecho={undefined} onListo={onListo} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Educación' }))
    fireEvent.change(screen.getByPlaceholderText(copy.categorias.propiaPlaceholder), { target: { value: 'Mascotas' } })
    fireEvent.click(screen.getByRole('button', { name: copy.bancos.agregar }))
    enviar()
    const { categories } = onListo.mock.calls[0][0] as { categories: { name: string }[] }
    expect(categories.map((categoria) => categoria.name)).toContain('Mascotas')
    expect(categories.map((categoria) => categoria.name)).not.toContain('Educación')
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `cd web && npx vitest run src/features/onboarding/pasos`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 3: Intro y Monedas**

```tsx
// web/src/features/onboarding/pasos/intro.tsx
export const FORM_ID = 'paso-de-bienvenida'

// La intro no tiene campos: lo que dice lo dice Nimbo, desde el modal.
export const Intro = () => null
```

```tsx
// web/src/features/onboarding/pasos/monedas.tsx
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { copy } from '../copy'

export type EleccionDeMonedas = 'CRC' | 'CRC+USD'

interface Props {
  valor: EleccionDeMonedas
  onCambio: (valor: EleccionDeMonedas) => void
}

export const Monedas = ({ valor, onCambio }: Props) => (
  <RadioGroup value={valor} onValueChange={(nuevo) => onCambio(nuevo as EleccionDeMonedas)} className="gap-3">
    {(
      [
        ['CRC', copy.monedas.soloColones],
        ['CRC+USD', copy.monedas.ambas],
      ] as const
    ).map(([clave, texto]) => (
      <Label key={clave} className="flex items-center gap-3 rounded-lg border border-border p-3 has-data-[state=checked]:border-primary">
        <RadioGroupItem value={clave} />
        {texto}
      </Label>
    ))}
  </RadioGroup>
)
```

- [ ] **Step 4: Bancos**

```tsx
// web/src/features/onboarding/pasos/bancos.tsx
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '../copy'
import type { BancoCreado, Moneda } from '../types'
import { FORM_ID } from './intro'

interface Props {
  hecho: BancoCreado[] | undefined
  onListo: (pedido: { banks: { name: string; currency: Moneda }[] } | null) => void
  monedas: Moneda[]
}

const clave = (name: string, currency: Moneda) => `${name}|${currency}`

export const Bancos = ({ hecho, onListo, monedas }: Props) => {
  const [nombres, setNombres] = useState<string[]>([...copy.bancos.sugeridos])
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [otro, setOtro] = useState('')

  if (hecho) {
    return (
      <ul className="space-y-1 text-sm">
        {hecho.map((banco) => (
          <li key={banco.bankAccountId}>{banco.name}</li>
        ))}
      </ul>
    )
  }

  const alternar = (llave: string) =>
    setMarcados((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(llave)) siguientes.delete(llave)
      else siguientes.add(llave)
      return siguientes
    })

  const agregarOtro = () => {
    const nombre = otro.trim()
    if (!nombre || nombres.includes(nombre)) return
    setNombres([...nombres, nombre])
    alternar(clave(nombre, 'CRC'))
    setOtro('')
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const banks = nombres.flatMap((name) =>
      monedas.filter((currency) => marcados.has(clave(name, currency))).map((currency) => ({ name, currency })),
    )
    onListo(banks.length > 0 ? { banks } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-3">
      <ul className="grid gap-2">
        {nombres.map((name) => (
          <li key={name} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border px-3 py-2">
            <span className="min-w-32 text-sm font-medium">{name}</span>
            {monedas.map((currency) => (
              <Label key={currency} className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  aria-label={`${name} · ${copy.bancos.moneda[currency]}`}
                  checked={marcados.has(clave(name, currency))}
                  onCheckedChange={() => alternar(clave(name, currency))}
                />
                {copy.bancos.moneda[currency]}
              </Label>
            ))}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={otro}
          onChange={(evento) => setOtro(evento.target.value)}
          placeholder={copy.bancos.otroPlaceholder}
          aria-label={copy.bancos.otro}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              agregarOtro()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={agregarOtro}>
          {copy.bancos.agregar}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Saldos**

```tsx
// web/src/features/onboarding/pasos/saldos.tsx
import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/lib/money'
import { copy } from '../copy'
import type { BancoCreado, Moneda, SaldosCargados } from '../types'
import { FORM_ID } from './intro'

interface Props {
  hecho: SaldosCargados | undefined
  onListo: (pedido: { date: string; balances: { accountCode: string; amount: string }[] } | null) => void
  monedas: Moneda[]
  bancos: BancoCreado[]
}

const CAJA: Record<Moneda, string> = { CRC: '1101', USD: '1102' }

// La fecha del teléfono y no la del servidor: allá es UTC, y después de las 18:00 en Costa Rica
// «hoy» sería mañana.
const hoyLocal = () => {
  const ahora = new Date()
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

export const Saldos = ({ hecho, onListo, monedas, bancos }: Props) => {
  const [montos, setMontos] = useState<Record<string, string>>({})

  if (hecho) return <p className="text-sm text-muted-foreground">{copy.hecho}</p>

  const filas = [
    ...monedas.map((currency) => ({ accountCode: CAJA[currency], label: copy.saldos.caja[currency], currency, admiteNegativo: false })),
    ...bancos
      .filter((banco) => monedas.includes(banco.currency))
      .map((banco) => ({ accountCode: banco.accountCode, label: banco.name, currency: banco.currency, admiteNegativo: true })),
  ]

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const balances = filas.flatMap(({ accountCode, currency }) => {
      const texto = montos[accountCode]?.trim()
      if (!texto) return []
      return [{ accountCode, amount: parseMoneyInput(texto, currency).minorUnits }]
    })
    onListo(balances.length > 0 ? { date: hoyLocal(), balances } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-3">
      {bancos.length === 0 ? <p className="text-sm text-muted-foreground">{copy.saldos.sinBancos}</p> : null}
      {filas.map(({ accountCode, label, admiteNegativo }) => (
        <div key={accountCode} className="grid gap-1">
          <Label htmlFor={`saldo-${accountCode}`}>{label}</Label>
          <Input
            id={`saldo-${accountCode}`}
            inputMode={admiteNegativo ? 'text' : 'decimal'}
            className="num"
            value={montos[accountCode] ?? ''}
            onChange={(evento) => setMontos({ ...montos, [accountCode]: evento.target.value })}
          />
        </div>
      ))}
    </form>
  )
}
```

Hay que verificar la firma de `parseMoneyInput` en `web/src/lib/money.ts`: qué devuelve y cómo trata el signo menos. Si devuelve otra cosa, ajustar para obtener `minorUnits` como string. Si no acepta negativos, parsear el valor absoluto y anteponer `-`.

- [ ] **Step 6: Categorías**

```tsx
// web/src/features/onboarding/pasos/categorias.tsx
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '../copy'
import type { CategoriaCreada } from '../types'
import { FORM_ID } from './intro'

type Tipo = 'EXPENSE' | 'INCOME'
interface Categoria {
  name: string
  kind: Tipo
}

interface Props {
  hecho: CategoriaCreada[] | undefined
  onListo: (pedido: { categories: Categoria[] } | null) => void
}

const sugeridas = (): Categoria[] =>
  (['EXPENSE', 'INCOME'] as const).flatMap((kind) => copy.categorias.sugeridas[kind].map((name) => ({ name, kind })))

export const Categorias = ({ hecho, onListo }: Props) => {
  const [todas, setTodas] = useState<Categoria[]>(sugeridas)
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(sugeridas().map((c) => c.name)))
  const [propia, setPropia] = useState('')
  const [tipo, setTipo] = useState<Tipo>('EXPENSE')

  if (hecho) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.categorias(hecho.length)}</p>

  const alternar = (name: string) =>
    setMarcadas((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(name)) siguientes.delete(name)
      else siguientes.add(name)
      return siguientes
    })

  const agregar = () => {
    const name = propia.trim()
    if (!name || todas.some((c) => c.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) return
    setTodas([...todas, { name, kind: tipo }])
    setMarcadas(new Set([...marcadas, name]))
    setPropia('')
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const categories = todas.filter((c) => marcadas.has(c.name))
    onListo(categories.length > 0 ? { categories } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-4">
      {(['EXPENSE', 'INCOME'] as const).map((kind) => (
        <fieldset key={kind} className="space-y-2">
          <legend className="text-sm font-medium">{kind === 'EXPENSE' ? copy.categorias.gasto : copy.categorias.ingreso}</legend>
          <div className="flex flex-wrap gap-2">
            {todas
              .filter((c) => c.kind === kind)
              .map(({ name }) => (
                <Label key={name} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-normal">
                  <Checkbox aria-label={name} checked={marcadas.has(name)} onCheckedChange={() => alternar(name)} />
                  {name}
                </Label>
              ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2">
        <Input value={propia} onChange={(e) => setPropia(e.target.value)} placeholder={copy.categorias.propiaPlaceholder} aria-label={copy.categorias.propia} />
        <Button type="button" variant="outline" onClick={() => setTipo(tipo === 'EXPENSE' ? 'INCOME' : 'EXPENSE')}>
          {copy.categorias.tipo[tipo]}
        </Button>
        <Button type="button" variant="outline" onClick={agregar}>
          {copy.bancos.agregar}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 7: Ingreso y Cierre**

```tsx
// web/src/features/onboarding/pasos/ingreso.tsx
import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/lib/money'
import { copy } from '../copy'
import type { IngresoDeclarado } from '../types'
import { FORM_ID } from './intro'

interface Props {
  hecho: IngresoDeclarado | undefined
  onListo: (pedido: { month: string; amount: { minorUnits: string; currency: 'CRC' } } | null) => void
}

const mesLocal = () => {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

export const Ingreso = ({ hecho, onListo }: Props) => {
  const [monto, setMonto] = useState('')
  if (hecho) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.ingreso}</p>

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!monto.trim()) return onListo(null)
    onListo({ month: mesLocal(), amount: { minorUnits: parseMoneyInput(monto, 'CRC').minorUnits, currency: 'CRC' } })
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="grid gap-1">
      <Label htmlFor="ingreso-inicial">{copy.ingreso.label}</Label>
      <Input id="ingreso-inicial" inputMode="decimal" className="num" value={monto} onChange={(e) => setMonto(e.target.value)} />
    </form>
  )
}
```

```tsx
// web/src/features/onboarding/pasos/cierre.tsx
import { copy } from '../copy'

interface Props {
  resumen: { bancos: number; categorias: number; saldos: boolean; ingreso: boolean }
}

export const Cierre = ({ resumen }: Props) => {
  const lineas = [
    resumen.bancos > 0 ? copy.cierre.resumen.bancos(resumen.bancos) : null,
    resumen.categorias > 0 ? copy.cierre.resumen.categorias(resumen.categorias) : null,
    resumen.saldos ? copy.cierre.resumen.saldos : null,
    resumen.ingreso ? copy.cierre.resumen.ingreso : null,
  ].filter((linea): linea is string => linea !== null)

  if (lineas.length === 0) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.nada}</p>
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {lineas.map((linea) => (
        <li key={linea}>{linea}</li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 8: Correr**

Run: `cd web && npx vitest run src/features/onboarding`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add web/src/features/onboarding/pasos
git commit -m "✨ feat: los pasos de la bienvenida"
```

---

### Task 12: Web — el modal y su montaje

**Files:**
- Create: `web/src/features/onboarding/bienvenida.tsx`
- Create: `web/src/features/onboarding/bienvenida.spec.tsx`
- Modify: `web/src/routes/__root.tsx`
- Modify: `web/src/features/shell/novedades.md`

**Interfaces:**
- Consumes: todo lo de las tareas 10 y 11.
- Produces: `export default function Bienvenida()`, con export por defecto para `lazy()`; y `export const BienvenidaSiHaceFalta` en `__root.tsx` (local).

- [ ] **Step 1: Tests del modal**

```tsx
// web/src/features/onboarding/bienvenida.spec.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Bienvenida from './bienvenida'
import { copy } from './copy'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Bienvenida />
    </QueryClientProvider>,
  )

afterEach(() => vi.restoreAllMocks())

const conEstado = (estado: object, alPost: (url: string) => Promise<Response> = async () => respuesta(null, 204)) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) =>
    init?.method === 'POST' ? alPost(String(url)) : respuesta(estado),
  )

describe('Bienvenida', () => {
  it('no se abre si no está pendiente', async () => {
    const fetch = conEstado({ pending: false, bookId: 'b1', steps: {} })
    montar()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('pendiente: se abre, la marca y manda los pasos al libro en que se abrió', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/onboarding/start'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-libro': 'b1' }) })),
    )
  })

  it('saltear no llama a nada', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas no llama
    const antes = fetch.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltear })) // bancos
    expect(fetch.mock.calls.length).toBe(antes)
    expect(screen.getByRole('heading', { name: copy.saldos.title })).toBeInTheDocument()
  })

  it('cerrar pide confirmación', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(await screen.findByText(copy.cerrar.description)).toBeInTheDocument()
  })

  it('un error de red deja el paso con reintentar', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} }, async (url) => {
      if (url.includes('/banks')) throw new TypeError('red')
      return respuesta(null, 204)
    })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'BN · Colones' }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente }))
    expect(await screen.findByRole('button', { name: copy.botones.reintentar })).toBeInTheDocument()
  })
})
```

En el último test, el mock rechaza para `/banks`, y `fetchAlServidor` convierte ese rechazo en `ErrorDeRed`.

- [ ] **Step 2: Ver que fallan**

Run: `cd web && npx vitest run src/features/onboarding/bienvenida.spec.tsx`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 3: El modal**

```tsx
// web/src/features/onboarding/bienvenida.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import type { NombreDeGesto } from '@/features/shell/bloub'
import { copy } from './copy'
import { NimboDice } from './nimbo-dice'
import { Bancos } from './pasos/bancos'
import { Categorias } from './pasos/categorias'
import { Cierre } from './pasos/cierre'
import { FORM_ID } from './pasos/intro'
import { Ingreso } from './pasos/ingreso'
import { Monedas, type EleccionDeMonedas } from './pasos/monedas'
import { Saldos } from './pasos/saldos'
import type { BancoCreado, CategoriaCreada, IngresoDeclarado, Moneda, SaldosCargados } from './types'
import { useEmpezarBienvenida, useOnboardingStatus, usePasoDeBienvenida } from './use-onboarding'

const PASOS = ['intro', 'monedas', 'bancos', 'saldos', 'categorias', 'ingreso', 'cierre'] as const
type Paso = (typeof PASOS)[number]

const GESTO: Record<Paso, NombreDeGesto> = {
  intro: 'contento',
  monedas: 'neutro',
  bancos: 'neutro',
  saldos: 'desconfiado',
  categorias: 'neutro',
  ingreso: 'neutro',
  cierre: 'orgulloso',
}

interface Hechos {
  bancos?: BancoCreado[]
  saldos?: SaldosCargados
  categorias?: CategoriaCreada[]
  ingreso?: IngresoDeclarado
}

export default function Bienvenida() {
  const estado = useOnboardingStatus()
  const empezar = useEmpezarBienvenida()
  const [abierta, setAbierta] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [paso, setPaso] = useState<Paso>('intro')
  const [monedas, setMonedas] = useState<EleccionDeMonedas>('CRC')
  const [hechos, setHechos] = useState<Hechos>({})
  const [error, setError] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const navegar = useNavigate()

  const bookId = estado.data?.bookId ?? ''
  const bancos = usePasoDeBienvenida<object, BancoCreado[]>(bookId, 'banks')
  const saldos = usePasoDeBienvenida<object, SaldosCargados>(bookId, 'opening-balances')
  const categorias = usePasoDeBienvenida<object, CategoriaCreada[]>(bookId, 'categories')
  const ingreso = usePasoDeBienvenida<object, IngresoDeclarado>(bookId, 'income')

  // Se abre una vez y se marca en el acto: aunque se cierre la pestaña a mitad, no vuelve.
  useEffect(() => {
    if (!estado.data?.pending || abierta) return
    const pasos = estado.data.steps as Record<string, unknown>
    setHechos({
      bancos: pasos.banks as BancoCreado[] | undefined,
      saldos: pasos['opening-balances'] as SaldosCargados | undefined,
      categorias: pasos.categories as CategoriaCreada[] | undefined,
      ingreso: pasos.income as IngresoDeclarado | undefined,
    })
    setAbierta(true)
    empezar.mutate(estado.data.bookId)
  }, [estado.data, abierta, empezar])

  useEffect(() => titulo.current?.focus(), [paso])

  const indice = PASOS.indexOf(paso)
  const avanzar = () => {
    setError(null)
    setPaso(PASOS[Math.min(indice + 1, PASOS.length - 1)])
  }
  const retroceder = () => {
    setError(null)
    setPaso(PASOS[Math.max(indice - 1, 0)])
  }

  const mandar = async <R,>(mutacion: { mutateAsync: (e: object) => Promise<R> }, pedido: object | null, guardar: (r: R) => void) => {
    if (pedido === null) return avanzar()
    try {
      guardar(await mutacion.mutateAsync(pedido))
      avanzar()
    } catch (causa) {
      setError(causa instanceof ApiError ? causa.message : copy.botones.reintentar)
    }
  }

  const listaDeMonedas: Moneda[] = monedas === 'CRC' ? ['CRC'] : ['CRC', 'USD']
  const ocupado = bancos.isPending || saldos.isPending || categorias.isPending || ingreso.isPending
  const conFormulario = ['bancos', 'saldos', 'categorias', 'ingreso'].includes(paso) && !hechoDe(paso, hechos)

  const cerrar = () => setAbierta(false)
  const ir = (to: '/guia' | '/presupuesto/modelos') => {
    cerrar()
    void navegar({ to })
  }

  return (
    <>
      <Dialog
        open={abierta}
        onOpenChange={(abrir) => {
          if (!abrir) setConfirmarCierre(true)
        }}
      >
        <DialogContent
          aria-describedby={`dice-${paso}`}
          className="max-sm:h-svh max-sm:max-w-none max-sm:rounded-none sm:max-w-xl"
        >
          <DialogHeader>
            <p className="text-xs text-muted-foreground">{copy.pasoDe(indice + 1, PASOS.length)}</p>
            <DialogTitle ref={titulo} tabIndex={-1} className="outline-none">
              {copy[paso].title}
            </DialogTitle>
          </DialogHeader>

          <NimboDice gesto={GESTO[paso]} id={`dice-${paso}`}>
            {copy[paso].nimbo}
          </NimboDice>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {paso === 'monedas' ? <Monedas valor={monedas} onCambio={setMonedas} /> : null}
            {paso === 'bancos' ? (
              <Bancos hecho={hechos.bancos} monedas={listaDeMonedas} onListo={(p) => void mandar(bancos, p, (r) => setHechos({ ...hechos, bancos: r }))} />
            ) : null}
            {paso === 'saldos' ? (
              <Saldos
                hecho={hechos.saldos}
                monedas={listaDeMonedas}
                bancos={hechos.bancos ?? []}
                onListo={(p) => void mandar(saldos, p, (r) => setHechos({ ...hechos, saldos: r }))}
              />
            ) : null}
            {paso === 'categorias' ? (
              <Categorias hecho={hechos.categorias} onListo={(p) => void mandar(categorias, p, (r) => setHechos({ ...hechos, categorias: r }))} />
            ) : null}
            {paso === 'ingreso' ? (
              <Ingreso hecho={hechos.ingreso} onListo={(p) => void mandar(ingreso, p, (r) => setHechos({ ...hechos, ingreso: r }))} />
            ) : null}
            {paso === 'cierre' ? (
              <Cierre
                resumen={{
                  bancos: hechos.bancos?.length ?? 0,
                  categorias: hechos.categorias?.length ?? 0,
                  saldos: (hechos.saldos?.entries.length ?? 0) > 0,
                  ingreso: hechos.ingreso !== undefined,
                }}
              />
            ) : null}
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            {paso === 'intro' ? (
              <Button onClick={avanzar}>{copy.botones.empezar}</Button>
            ) : paso === 'cierre' ? (
              <>
                <Button variant="outline" onClick={() => ir('/presupuesto/modelos')}>
                  {copy.cierre.modelos}
                </Button>
                <Button onClick={() => ir('/guia')}>{copy.cierre.guia}</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={retroceder} disabled={ocupado}>
                  {copy.botones.atras}
                </Button>
                {conFormulario ? (
                  <Button variant="outline" onClick={avanzar} disabled={ocupado}>
                    {copy.botones.saltear}
                  </Button>
                ) : null}
                {conFormulario ? (
                  <Button type="submit" form={FORM_ID} disabled={ocupado}>
                    {error ? copy.botones.reintentar : copy.botones.siguiente}
                  </Button>
                ) : (
                  <Button onClick={avanzar}>{copy.botones.siguiente}</Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.cerrar.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.cerrar.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cerrar.seguir}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarCierre(false)
                cerrar()
              }}
            >
              {copy.cerrar.confirmar}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const hechoDe = (paso: Paso, hechos: Hechos): boolean =>
  (paso === 'bancos' && hechos.bancos !== undefined) ||
  (paso === 'saldos' && hechos.saldos !== undefined) ||
  (paso === 'categorias' && hechos.categorias !== undefined) ||
  (paso === 'ingreso' && hechos.ingreso !== undefined)
```

`copy[paso].nimbo` y `copy[paso].title` existen para los siete pasos: los define la Tarea 10. Si `DialogTitle` no reenvía `ref`, envolver el título en un `<h2 ref={titulo} tabIndex={-1}>` dentro de `DialogTitle asChild`. Cada llamada de paso en la JSX usa la misma mutación `mandar`, con su setter. Si el lint pide funciones más chicas, extraer un `usePasos(bookId)` que devuelva las cuatro mutaciones.

- [ ] **Step 4: Montaje en el shell**

En `web/src/routes/__root.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import { useOnboardingStatus } from '@/features/onboarding/use-onboarding'

// El modal pesa y lo ve una persona una sola vez: se descarga solo si hace falta.
const Bienvenida = lazy(() => import('@/features/onboarding/bienvenida'))

const BienvenidaSiHaceFalta = () => {
  const { data } = useOnboardingStatus()
  if (!data?.pending) return null
  return (
    <Suspense fallback={null}>
      <Bienvenida />
    </Suspense>
  )
}
```

Dentro de `Shell`, después de `<ShortcutsSheet ... />`: `<BienvenidaSiHaceFalta />`. `lazy` y `Suspense` se suman al import de `react` que ya existe.

- [ ] **Step 5: Novedades**

Agregar arriba de la primera entrega de `web/src/features/shell/novedades.md` una entrega nueva. La versión la fija quien publique; mientras tanto, usar la siguiente menor a la última publicada:

```md
## 2026-09-25 · v1.5.0

### Nuevo

- **Bienvenida para quien empieza.** Nimbo te acompaña a cargar tus bancos, los saldos de hoy,
  tus categorías (cada una con su cuenta) y el ingreso del mes. Aparece una sola vez.
```

Correr `npx vitest run src/features/shell/release-notes.spec.ts` para validar el formato.

- [ ] **Step 6: Correr todo lo del front**

Run: `cd web && npx vitest run src/features/onboarding src/features/shell && npx tsc -b --noEmit && npx oxlint src`
Expected: PASS, cero errores.

- [ ] **Step 7: Bundle**

Run: `cd web && npx vite build && npx size-limit`
Expected: JS de entrada ≤ 115,4 kB. El modal tiene que salir en un chunk propio. Si el de entrada sube, es porque `use-onboarding.ts` arrastró algo pesado: mover `useOnboardingStatus` a un archivo sin dependencias de UI.

- [ ] **Step 8: Probarlo en el navegador**

Con la api y la web levantadas (`npm run dev` en la raíz), registrar una cuenta nueva por un enlace de invitación a la app. Recorrer los siete pasos en 390 px y en 1280 px, en claro y en oscuro. Verificar:
- Nimbo cambia de gesto.
- Escape pide confirmación.
- Recargar a mitad no reabre el modal.
- Las cuentas 1121, 6201 y 4201 aparecen en el plan.
- El asiento de apertura aparece en el mayor.

- [ ] **Step 9: Tarea completa**

Run: `npm run check:task` en la raíz.
Expected: verde, con cobertura de lo nuevo ≥ 80 %.

- [ ] **Step 10: Commit**

```bash
git add web/src/features/onboarding web/src/routes/__root.tsx web/src/features/shell/novedades.md
git commit -m "✨ feat: bienvenida con Nimbo para quien empieza"
```

---

## Cierre

- [ ] `npm run check:full` antes del push (≈ 13 min), como pide `CONSTRAINTS.md`.
- [ ] Revisión final de toda la rama con un revisor fresco (`code-review`).
