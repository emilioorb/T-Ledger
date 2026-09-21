# Fase 6a · Fundación: cuentas, libros y aislamiento — Plan de implementación

> **Para quien ejecute:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos
> usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** que Tape Ledger sepa quién sos, que una persona lleve varios libros con un solo
correo, y que un libro no pueda ver jamás los datos de otro.

**Arquitectura:** Better Auth con su plugin `organization`, donde cada organización es un
libro. Las 19 tablas existentes reciben `bookId`. El aislamiento va en dos capas: una
extensión de Prisma en el getter `client` de `PrismaService`, que inyecta el filtro en toda
consulta y **falla cerrado** si no hay libro en el contexto, más una guardia de rol explícita
por endpoint.

**Stack:** NestJS 12 en ESM, Prisma 7, Zod 4.6.5, Better Auth, Vitest 5, PostgreSQL en Docker
(`finanzas-db-1`, puerto 5433, usuario `finanzas`).

**Spec:** `docs/superpowers/specs/2026-09-21-multiusuario-design.md`, secciones 4, 5 y 9.
**Decisiones:** `docs/decisions/ADR-001-un-usuario-varios-libros.md` y
`docs/decisions/ADR-002-aislamiento-entre-libros.md`.

## Restricciones globales

- `api/src/modules/*/domain/**` queda libre de Nest, Prisma y HTTP. El linter lo hace cumplir
  y hoy no hay una sola violación. Eso es lo que mantiene abierta la puerta del cifrado
  (ADR-003) y no se degrada en este plan.
- Prisma 7 removió `$use`. Las client extensions son el único mecanismo de intercepción.
- Todo lo que se escribe es TypeScript, incluidos los scripts sueltos, que se corren con
  `tsx`. Nunca `.js` ni `.mjs` como fuente.
- Ambos paquetes son ESM con NodeNext: dentro de un archivo `.ts`, los imports internos se
  escriben con extensión `.js` porque apuntan al compilado. Es lo que el repo ya hace en todos
  lados, y los `.js` que aparecen en los comandos de arranque son el build, no fuente.
- Prettier con `--no-semi --single-quote --print-width 100`. Nunca sobre
  `web/src/components/ui/**`.
- `.partial()` de Zod 4 **conserva los `.default()`**, así que un esquema PATCH derivado de
  uno de creación rellena claves ausentes en silencio. Cualquier esquema nuevo de este plan
  que use `.partial()` tiene que llevar su test de que una clave ausente queda ausente.
- Roles: `owner`, `editor`, `viewer`. En la interfaz nunca aparece la palabra «organización»:
  se llama libro.
- Errores: 401 sin sesión, 403 por rol insuficiente **o por recurso de otro libro**. Nunca
  404, porque un 404 distinto de un 403 confirma que ese id existe.
- Los tipos del front se regeneran con `npm run api:types` en `web/`, con la API arriba.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `api/src/modules/identity/` | Módulo nuevo. Todo lo de cuentas, libros y membresías. |
| `api/src/modules/identity/infrastructure/auth.config.ts` | La instancia de Better Auth y los roles. |
| `api/src/modules/identity/infrastructure/libro-context.ts` | El `AsyncLocalStorage` del libro activo. |
| `api/src/modules/identity/infrastructure/libro.guard.ts` | Puebla el contexto desde la sesión. |
| `api/src/modules/identity/infrastructure/rol.guard.ts` | La guardia de rol por endpoint. |
| `api/src/modules/identity/infrastructure/libros.controller.ts` | Listar libros y cambiar el activo. |
| `api/src/shared/prisma/libro-filter.extension.ts` | La extensión que filtra por `bookId`. |
| `api/src/shared/prisma/prisma.service.ts` | El getter `client` devuelve el cliente extendido. |
| `api/prisma/schema.prisma` | Tablas de Better Auth, `Book`, y `bookId` en las 19. |
| `web/src/features/identity/` | Login, selector de libro, cliente de auth tipado a mano. |

---

### Tarea 1 (BLOQUEANTE): ¿Better Auth entra en este proyecto? — ✅ RESUELTA el 21/09/2026

**Las tres preguntas dieron que sí. El ADR-001 sobrevive y se sigue con la tarea 2.** El spike
se corrió, se anotó en el ADR y se borró. Los pasos quedan abajo por si hay que repetirlo
contra otras versiones.

Cinco cosas que salieron del spike y que cambian tareas de más adelante:

1. **Las rutas de auth viven en `/api/auth/*`, fuera del `setGlobalPrefix('api/v1')`.** El
   handler se monta antes que el prefijo de Nest. `/api/v1/auth/...` da 404. El cliente
   tipado a mano de la tarea 8 tiene que apuntar a `/api/auth`.
2. **El guard de Better Auth es global por defecto y devuelve 401 en todo.** Es lo que
   queremos, pero hay que marcar explícitamente lo que deba ser público con
   `@AllowAnonymous()`. Nota: `/api/v1/openapi.json` quedó accesible igual porque se monta con
   `getHttpAdapter().get()`, fuera de Nest, así que no pasa por el guard. Si alguna vez se
   mueve a un controlador, deja de responder sin sesión.
3. **Better Auth valida el esquema al arrancar y falla en toda petición si faltan tablas**, no
   solo en las de auth. Con las tablas ausentes, `GET /api/v1/categories` devolvía 500 por un
   `SchemaMismatchError`. O sea que la tarea 2 no es opcional antes de seguir.
4. **`@better-auth/cli` está deprecado.** El comando que sirve es `npx auth migrate`, que es
   el que el propio mensaje de error de Better Auth sugiere.
5. **Los peers extra del paquete (`@nestjs/graphql`, `@nestjs/websockets`, `graphql`, `qs`,
   `express`) son todos opcionales**, así que no hay que instalar nada de eso.

---

<details>
<summary>Los pasos del spike, por si hay que repetirlo</summary>

El ADR-001 eligió Better Auth sobre autenticación propia, pero la integración con NestJS es de
la comunidad (`@thallesp/nestjs-better-auth`) y exige arrancar Nest con `bodyParser: false`.
Esta API valida todo con Zod sobre el cuerpo ya parseado, y además es ESM, que es donde estas
integraciones suelen romperse. Nada de eso se verificó al decidir.

El resultado de esta tarea es una respuesta, no código que se conserve. Lo que se construya
acá se etiqueta como descartable y se borra.

**Archivos:** ninguno permanente. Rama descartable.

- [ ] **Paso 1: rama aparte**

```bash
git checkout -b spike/better-auth
```

- [ ] **Paso 2: instalar y montar lo mínimo**

```bash
cd api && npm install better-auth @thallesp/nestjs-better-auth
```

Montar `AuthModule.forRoot({ auth })` en `app.module.ts` con una instancia mínima de Better
Auth contra el Postgres que ya corre, y poner `bodyParser: false` en `NestFactory.create`.

- [ ] **Paso 3: las tres preguntas que hay que contestar**

Correr `npm run start:dev` y verificar, en este orden:

1. **¿Arranca?** Si el paquete no carga bajo ESM, se muere acá.
2. **¿Siguen funcionando los endpoints existentes?** Pegarle a
   `POST /api/v1/contabilidad/movimientos` con un cuerpo válido. Con `bodyParser: false`, si
   el paquete no repone el parser para el resto de las rutas, esto devuelve 400 o 500 y los
   pipes de Zod no ven nada.
3. **¿Funciona el registro?** `POST /api/auth/sign-up/email` tiene que crear un usuario en la
   tabla `user`.

- [ ] **Paso 4: anotar el resultado y decidir**

**Si las tres pasan:** se sigue con la tarea 2. Anotar en el ADR-001, bajo Consecuencias, que
la verificación se hizo y con qué versiones.

**Si falla la 2 (que es la más probable):** antes de abandonar, probar montar el handler de
Better Auth con `app.use()` sobre su prefijo de ruta y dejar el `bodyParser` global vivo para
todo lo demás. Es un rato de trabajo y salva la decisión.

**Si falla la 1 o la 3, o si la 2 no se salva:** el ADR-001 se reemplaza por un ADR-006 que
elige autenticación propia con el contrato Zod, y este plan se reescribe desde la tarea 2. La
alternativa ya está documentada en ADR-001 con sus pros y contras, así que la decisión está
tomada de antemano: no hay que volver a discutirla, solo registrarla.

- [ ] **Paso 5: borrar el spike**

```bash
git checkout master && git branch -D spike/better-auth
```

El código del spike no se conserva. Lo que se conserva es la respuesta, escrita en el ADR.

</details>

---

### Tarea 2: Las tablas de identidad

**Archivos:**
- Modificar: `api/prisma/schema.prisma`
- Crear: `api/src/modules/identity/infrastructure/auth.config.ts`
- Crear: `api/src/modules/identity/infrastructure/auth.config.spec.ts`

**Interfaces:**
- Consume: la respuesta de la tarea 1.
- Produce: `auth` (instancia de Better Auth) y `ac`, `owner`, `editor`, `viewer` (los roles),
  que consumen las tareas 4 y 7.

- [ ] **Paso 1: escribir el test de los roles que falla**

`api/src/modules/identity/infrastructure/auth.config.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { editor, owner, viewer } from './auth.config.js'

describe('roles del libro', () => {
  it('el que mira no escribe: es la razón de que exista el rol', () => {
    expect(viewer.authorize({ movimiento: ['create'] }).success).toBe(false)
    expect(viewer.authorize({ movimiento: ['read'] }).success).toBe(true)
  })

  it('el editor hace toda la contabilidad', () => {
    expect(editor.authorize({ movimiento: ['create', 'update', 'delete'] }).success).toBe(true)
    expect(editor.authorize({ periodo: ['close'] }).success).toBe(true)
  })

  it('el editor no toca la gente ni borra el libro', () => {
    expect(editor.authorize({ member: ['create'] }).success).toBe(false)
    expect(editor.authorize({ libro: ['delete'] }).success).toBe(false)
  })

  it('el dueño invita, saca gente y borra el libro', () => {
    expect(owner.authorize({ member: ['create', 'delete'] }).success).toBe(true)
    expect(owner.authorize({ libro: ['delete'] }).success).toBe(true)
  })
})
```

- [ ] **Paso 2: correr y ver que falla**

```bash
cd api && npx vitest run src/modules/identity/infrastructure/auth.config.spec.ts
```

Esperado: FALLA, no existe el módulo.

- [ ] **Paso 3: escribir la configuración**

`api/src/modules/identity/infrastructure/auth.config.ts`:

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'

// Los roles que trae Better Auth (`owner`, `admin`, `member`, donde `member` es solo lectura)
// confunden con lo que hace falta acá: en una pareja los dos anotan. Se definen propios.
//
// `libro` reemplaza a `organization` en el vocabulario: en la interfaz esa palabra no aparece.
const statements = {
  ...defaultStatements,
  libro: ['update', 'delete', 'vaciar'],
  movimiento: ['create', 'read', 'update', 'delete'],
  periodo: ['read', 'close', 'reopen'],
  presupuesto: ['read', 'write'],
  deuda: ['read', 'write'],
  meta: ['read', 'write'],
  inversion: ['read', 'write'],
} as const

export const ac = createAccessControl(statements)

// Solo lee. Existe para el caso familiar: alguien ve el libro de la casa sin poder anotar.
export const viewer = ac.newRole({
  movimiento: ['read'],
  periodo: ['read'],
  presupuesto: ['read'],
  deuda: ['read'],
  meta: ['read'],
  inversion: ['read'],
})

// Toda la contabilidad y nada de la gente. Es el reparto de una pareja real.
export const editor = ac.newRole({
  movimiento: ['create', 'read', 'update', 'delete'],
  periodo: ['read', 'close', 'reopen'],
  presupuesto: ['read', 'write'],
  deuda: ['read', 'write'],
  meta: ['read', 'write'],
  inversion: ['read', 'write'],
})

// Lo del editor más la gente y el libro mismo.
export const owner = ac.newRole({
  ...editor.statements,
  libro: ['update', 'delete', 'vaciar'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
})
```

Y la instancia, en el mismo archivo:

```ts
export const crearAuth = (prisma: PrismaService, env: Env) =>
  betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      // Cerrado hasta que el producto se abra. Se entra por invitación y nada más.
      // Abrirlo el día que toque es cambiar este booleano, no escribir código (ADR-001).
      disableSignUp: true,
    },
    plugins: [organization({ ac, roles: { owner, editor, viewer } })],
  })
```

- [ ] **Paso 4: correr y ver que pasa**

```bash
cd api && npx vitest run src/modules/identity/infrastructure/auth.config.spec.ts
```

Esperado: 4 pasan. Si la API de `authorize` difiere de la que usa el test, ajustar el test a
la forma real que documenta Better Auth: lo que se está probando es el reparto de permisos,
no la firma.

- [ ] **Paso 5: generar las tablas**

Correr la migración de Better Auth para que cree `user`, `session`, `account`,
`verification`, `organization`, `member` e `invitation`, y después:

```bash
cd api && npx prisma migrate dev --name identidad
```

- [ ] **Paso 6: verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

```bash
git add api/prisma api/src/modules/identity api/package.json api/package-lock.json
git commit -m "✨ feat: cuentas y libros, con tres roles propios"
```

---

### Tarea 3: `bookId` en las 19 tablas

**Archivos:**
- Modificar: `api/prisma/schema.prisma`
- Crear: la migración con el SQL de relleno

**Interfaces:**
- Consume: la tabla `organization` de la tarea 2.
- Produce: columna `bookId` en las 19 tablas, obligatoria y con índice.

Las 19: `Debt`, `ExchangeRate`, `Account`, `JournalEntry`, `JournalLine`, `Category`,
`Movement`, `AccountingPeriod`, `BudgetModel`, `BudgetBucket`, `BudgetIncome`, `Goal`,
`GoalContribution`, `Investment`, `InvestmentContribution`, `ImportProfile`, `BankAccount`,
`BankStatement`, `BankLine`.

- [ ] **Paso 1: agregar la columna a cada modelo**

En cada uno de los 19:

```prisma
  bookId String
  book   Organization @relation(fields: [bookId], references: [id], onDelete: Cascade)
```

Y en cada índice de consulta existente, anteponer `bookId`. Por ejemplo, si hay
`@@index([date])`, pasa a `@@index([bookId, date])`: toda consulta va a llevar el filtro de
libro adelante, así que un índice que no empiece por ahí no se usa.

`onDelete: Cascade` es lo que hace que borrar un libro se lleve su contenido sin 19 borrados
a mano. La protección contra borrar un libro por accidente es el flujo de tres pasos, no la
base.

**Excepción, `ExchangeRate`:** los tipos de cambio del BCCR son públicos y los mismos para
todo el mundo. Duplicarlos por libro es guardar la misma tabla N veces. **No lleva `bookId`**
y queda fuera del filtro de la tarea 5, con un comentario en el esquema que diga por qué. Son
18 tablas con `bookId`, no 19.

- [ ] **Paso 2: escribir la migración con el relleno**

La columna es obligatoria y ya hay filas, así que la migración es en tres tiempos: agregar
nullable, rellenar, y recién ahí ponerla obligatoria.

**Los modelos de Prisma no se llaman como las tablas.** Todos tienen `@@map` a snake_case en
plural, y escribir el SQL con el nombre del modelo hace fallar la migración entera. Los
nombres reales, verificados contra `\dt` en la base:

| Modelo | Tabla | Modelo | Tabla |
|---|---|---|---|
| `Debt` | `debts` | `Goal` | `goals` |
| `Account` | `accounts` | `GoalContribution` | `goal_contributions` |
| `JournalEntry` | `journal_entries` | `Investment` | `investments` |
| `JournalLine` | `journal_lines` | `InvestmentContribution` | `investment_contributions` |
| `Category` | `categories` | `ImportProfile` | `import_profiles` |
| `Movement` | `movements` | `BankAccount` | `bank_accounts` |
| `AccountingPeriod` | `accounting_periods` | `BankStatement` | `bank_statements` |
| `BudgetModel` | `budget_models` | `BankLine` | `bank_lines` |
| `BudgetBucket` | `budget_buckets` | `BudgetIncome` | `budget_income` |

(`ExchangeRate` → `exchange_rates` queda fuera, ver el paso 1.)

```sql
-- El libro de Emilio, que es todo lo que hay hoy.
INSERT INTO "organization" (id, name, slug, "createdAt")
VALUES ('lib_personal_emilio', 'Personal', 'personal', NOW());

-- Y su membresía como dueño. El userId sale de la cuenta creada en el paso 4. Si todavía no
-- existe, la migración falla ruidosa acá, que es lo correcto: un libro sin dueño no debería
-- poder existir.

ALTER TABLE movements ADD COLUMN "bookId" TEXT;
UPDATE movements SET "bookId" = 'lib_personal_emilio';
ALTER TABLE movements ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE movements ADD CONSTRAINT movements_bookId_fkey
  FOREIGN KEY ("bookId") REFERENCES "organization"(id) ON DELETE CASCADE;
```

Repetir el bloque de cuatro líneas para las otras 17 tablas. Es mecánico y es a propósito:
generarlo con un script que recorra el esquema esconde el orden de los tres tiempos, que es
lo único que puede salir mal acá.

- [ ] **Paso 3: correr la migración y verificar que no quedó nada suelto**

```bash
cd api && npx prisma migrate dev --name libro-en-todas-las-tablas
```

```sql
-- Tiene que devolver cero filas. Si devuelve alguna, hay una tabla sin rellenar.
SELECT 'movements' AS tabla, COUNT(*) FROM movements WHERE "bookId" IS NULL
UNION ALL SELECT 'journal_entries', COUNT(*) FROM journal_entries WHERE "bookId" IS NULL;
-- …y así con las 18.
```

- [ ] **Paso 4: crear la cuenta de Emilio**

Un script en `api/scripts/crear-primer-usuario.ts` que llame al `signUp` de Better Auth
salteando `disableSignUp`, y que inserte la membresía como `owner` del libro `Personal`. Queda
versionado porque el día que se despliegue en otro lado hace falta de nuevo.

En TypeScript como todo lo demás, corrido con `tsx`, que hay que sumar a las dependencias de
desarrollo:

```bash
cd api && npm install --save-dev tsx
npx tsx scripts/crear-primer-usuario.ts
```

- [ ] **Paso 5: commit**

```bash
git add api/prisma api/scripts
git commit -m "✨ feat: cada fila pertenece a un libro, y el que existe se llama Personal"
```

---

### Tarea 4: El contexto del libro activo

**Archivos:**
- Crear: `api/src/modules/identity/infrastructure/libro-context.ts`
- Crear: `api/src/modules/identity/infrastructure/libro-context.spec.ts`
- Crear: `api/src/modules/identity/infrastructure/libro.guard.ts`

**Interfaces:**
- Consume: la sesión de Better Auth de la tarea 2.
- Produce:
  - `libroActual(): { bookId: string; userId: string; rol: Rol }` — tira si no hay contexto
  - `conLibro<T>(ctx, fn: () => Promise<T>): Promise<T>`
  - `LibroGuard` — guardia global de Nest

- [ ] **Paso 1: escribir los tests que fallan**

`api/src/modules/identity/infrastructure/libro-context.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { conLibro, libroActual } from './libro-context.js'

const ctx = { bookId: 'lib_1', userId: 'usr_1', rol: 'editor' as const }

describe('contexto del libro', () => {
  it('adentro devuelve el libro', async () => {
    await conLibro(ctx, async () => {
      expect(libroActual().bookId).toBe('lib_1')
    })
  })

  it('afuera tira, no devuelve null', async () => {
    // Es la regla que sostiene todo el aislamiento. Si devolviera null o undefined, la
    // extensión de la tarea 5 armaría una consulta sin filtro y devolvería todos los libros.
    expect(() => libroActual()).toThrow(/sin libro/i)
  })

  it('los contextos anidados no se pisan', async () => {
    await conLibro(ctx, async () => {
      await conLibro({ ...ctx, bookId: 'lib_2' }, async () => {
        expect(libroActual().bookId).toBe('lib_2')
      })
      expect(libroActual().bookId).toBe('lib_1')
    })
  })

  it('sobrevive a un await, que es donde se pierde un contexto mal hecho', async () => {
    await conLibro(ctx, async () => {
      await new Promise((listo) => setTimeout(listo, 5))
      expect(libroActual().bookId).toBe('lib_1')
    })
  })
})
```

- [ ] **Paso 2: correr y ver que falla**

```bash
cd api && npx vitest run src/modules/identity/infrastructure/libro-context.spec.ts
```

- [ ] **Paso 3: escribir el contexto**

`api/src/modules/identity/infrastructure/libro-context.ts`:

```ts
import { AsyncLocalStorage } from 'node:async_hooks'

export type Rol = 'owner' | 'editor' | 'viewer'

export interface ContextoDeLibro {
  bookId: string
  userId: string
  rol: Rol
}

// El mismo mecanismo que `PrismaService` ya usa para el cliente transaccional: el dato viaja
// con la petición sin pasarse de mano en mano, así que los repositorios no cambian.
const almacen = new AsyncLocalStorage<ContextoDeLibro>()

export const conLibro = <T>(contexto: ContextoDeLibro, correr: () => Promise<T>): Promise<T> =>
  almacen.run(contexto, correr)

// Tira en vez de devolver `undefined`. Es la regla que sostiene el aislamiento entero: una
// consulta que corra fuera de contexto tiene que romperse ruidosa, porque la alternativa es
// armar un `where` vacío y devolver los libros de todo el mundo.
export const libroActual = (): ContextoDeLibro => {
  const contexto = almacen.getStore()
  if (!contexto) {
    throw new Error('Consulta sin libro en contexto: no hay a quién pertenecen estos datos')
  }
  return contexto
}
```

- [ ] **Paso 4: correr y ver que pasa**

Esperado: 4 pasan.

- [ ] **Paso 5: la guardia que puebla el contexto**

`api/src/modules/identity/infrastructure/libro.guard.ts`: un `CanActivate` global que

1. lee la sesión de Better Auth desde la petición; sin sesión, 401;
2. lee el libro activo de la cabecera `X-Libro`, y si no viene usa el único libro del usuario;
3. busca la membresía de ese usuario en ese libro; si no existe, **403 y no 404**, porque un
   404 distinto de un 403 confirma que ese libro existe;
4. envuelve el resto de la petición en `conLibro({ bookId, userId, rol }, …)`.

Se registra con `APP_GUARD` para que aplique a todo, y las rutas de Better Auth quedan fuera
con un decorador `@SinLibro()`, porque iniciar sesión pasa antes de tener libro.

- [ ] **Paso 6: commit**

```bash
git add api/src/modules/identity
git commit -m "✨ feat: cada petición sabe en qué libro está parada"
```

---

### Tarea 5: La extensión que filtra, y su prueba de fuego

Es la tarea que decide si el producto es publicable. Una fuga entre libros es el peor error
posible acá y es silencioso: nadie reporta ver datos de más.

**Archivos:**
- Crear: `api/src/shared/prisma/libro-filter.extension.ts`
- Crear: `api/src/shared/prisma/libro-filter.extension.spec.ts`
- Modificar: `api/src/shared/prisma/prisma.service.ts`

**Interfaces:**
- Consume: `libroActual()` de la tarea 4.
- Produce: `PrismaService.client` devuelve el cliente extendido. Los 14 repositorios no se
  tocan.

- [ ] **Paso 1: escribir los tests de aislamiento que fallan**

Estos van contra la base de verdad, no contra dobles: lo que se prueba es que Prisma emite el
`where` correcto, y un doble probaría el doble.

`api/src/shared/prisma/libro-filter.extension.spec.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { conLibro } from '../../modules/identity/infrastructure/libro-context.js'
import { PrismaService } from './prisma.service.js'

const prisma = new PrismaService(process.env.DATABASE_URL!)
const ctxA = { bookId: 'lib_a', userId: 'u', rol: 'editor' as const }
const ctxB = { bookId: 'lib_b', userId: 'u', rol: 'editor' as const }

describe('aislamiento entre libros', () => {
  beforeAll(async () => {
    // Dos libros con un movimiento cada uno. Sembrado crudo, sin pasar por la extensión.
  })

  it('cada libro ve lo suyo y nada más', async () => {
    const deA = await conLibro(ctxA, () => prisma.client.movement.findMany())
    const deB = await conLibro(ctxB, () => prisma.client.movement.findMany())

    expect(deA).toHaveLength(1)
    expect(deB).toHaveLength(1)
    expect(deA[0].id).not.toBe(deB[0].id)
  })

  it('pedir por id un movimiento del otro libro no lo devuelve', async () => {
    const deB = await conLibro(ctxB, () => prisma.client.movement.findMany())
    const robado = await conLibro(ctxA, () =>
      prisma.client.movement.findUnique({ where: { id: deB[0].id } }),
    )

    expect(robado).toBeNull()
  })

  it('crear sin decir el libro lo pone igual, y es el del contexto', async () => {
    const creado = await conLibro(ctxA, () =>
      prisma.client.movement.create({ data: { /* campos mínimos, sin bookId */ } as never }),
    )

    expect(creado.bookId).toBe('lib_a')
  })

  it('crear diciendo otro libro no se permite', async () => {
    await expect(
      conLibro(ctxA, () =>
        prisma.client.movement.create({ data: { bookId: 'lib_b' } as never }),
      ),
    ).rejects.toThrow()
  })

  it('actualizar un registro del otro libro no toca nada', async () => {
    const deB = await conLibro(ctxB, () => prisma.client.movement.findMany())
    const { count } = await conLibro(ctxA, () =>
      prisma.client.movement.updateMany({
        where: { id: deB[0].id },
        data: { description: 'intervenido' },
      }),
    )

    expect(count).toBe(0)
  })

  it('SIN CONTEXTO TIRA. Nunca devuelve todo', async () => {
    // El test más importante del archivo. Si algún día pasa a devolver filas en vez de tirar,
    // el aislamiento se cayó entero y ningún otro test de acá lo va a notar.
    await expect(prisma.client.movement.findMany()).rejects.toThrow(/sin libro/i)
  })

  it('los tipos de cambio quedan fuera del filtro: son públicos e iguales para todos', async () => {
    await expect(prisma.client.exchangeRate.findMany()).resolves.toBeInstanceOf(Array)
  })
})
```

- [ ] **Paso 2: correr y ver que falla**

```bash
cd api && npx vitest run src/shared/prisma/libro-filter.extension.spec.ts
```

- [ ] **Paso 3: escribir la extensión**

`api/src/shared/prisma/libro-filter.extension.ts`:

```ts
import { Prisma } from '../../generated/prisma/client.js'
import { libroActual } from '../../modules/identity/infrastructure/libro-context.js'

// Fuera del filtro a propósito: las tablas de Better Auth tienen su propio modelo de
// pertenencia, y los tipos de cambio del BCCR son públicos y los mismos para todo el mundo.
// Duplicarlos por libro sería guardar la misma tabla N veces.
const SIN_LIBRO = new Set([
  'ExchangeRate',
  'User',
  'Session',
  'Account',
  'Verification',
  'Organization',
  'Member',
  'Invitation',
])

// Prisma 7 removió `$use`, así que las extensiones son el único punto de intercepción. Va
// una sola vez, en el getter `client` de `PrismaService`, por donde pasan los 14
// repositorios sin excepción: por eso ninguno de ellos cambia.
export const filtroDeLibro = Prisma.defineExtension({
  name: 'filtro-de-libro',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || SIN_LIBRO.has(model)) return query(args)

        // Tira si no hay contexto. Nunca arma un `where` vacío: eso devolvería los libros de
        // todo el mundo, que es exactamente el error que esta extensión existe para impedir.
        const { bookId } = libroActual()

        if (operation === 'create') {
          return query({ ...args, data: { ...args.data, bookId } })
        }
        if (operation === 'createMany' || operation === 'createManyAndReturn') {
          const filas = Array.isArray(args.data) ? args.data : [args.data]
          return query({ ...args, data: filas.map((fila) => ({ ...fila, bookId })) })
        }

        // `upsert` lleva el libro en las tres partes: si el `where` no filtra, un upsert
        // desde otro libro actualizaría una fila ajena en vez de crear la propia.
        if (operation === 'upsert') {
          return query({
            ...args,
            where: { ...args.where, bookId },
            create: { ...args.create, bookId },
            update: args.update,
          })
        }

        return query({ ...args, where: { ...args.where, bookId } })
      },
    },
  },
})
```

**Sobre el test de «crear diciendo otro libro»:** con este código, un `bookId` explícito queda
pisado por el del contexto y la creación cae en el libro correcto en vez de fallar. Si al
correr el test se prefiere que tire, agregar antes del `create` una comparación que rechace un
`bookId` distinto del contexto. Decidirlo al implementar y dejar el test acorde: lo que no se
negocia es que **no puede terminar en el libro ajeno**.

- [ ] **Paso 4: enchufarla en el getter**

En `api/src/shared/prisma/prisma.service.ts`, el getter `client` devuelve el cliente extendido.
Cuidado con el Proxy: el comentario que ya está en ese archivo explica que `this` adentro es el
objeto crudo y que `this.self` guarda el Proxy. La extensión se aplica sobre `this.self` y
sobre el cliente transaccional, y el resultado se memoriza para no reconstruirla en cada
consulta.

- [ ] **Paso 5: correr los tests y ver que pasan**

```bash
cd api && npx vitest run src/shared/prisma/libro-filter.extension.spec.ts
```

Esperado: 7 pasan, incluido el de que sin contexto tira.

- [ ] **Paso 6: commit**

```bash
git add api/src/shared/prisma
git commit -m "🔒 feat: ninguna consulta cruza de un libro a otro, y sin libro no corre"
```

---

### Tarea 6: Los 59 specs

Con la extensión fallando cerrado, **todos los tests existentes fallan**: corren sin contexto
de libro. No es un efecto secundario molesto, es la prueba de que la red funciona. Si alguno
pasara sin libro, significaría que hay una consulta sin filtrar.

**Archivos:** los 59 `*.spec.ts` de `api/`.

- [ ] **Paso 1: ver el tamaño real del daño**

```bash
cd api && npm test 2>&1 | tail -30
```

Anotar cuántos fallan y con qué mensaje. Tienen que fallar todos con «sin libro en contexto».
**Si alguno falla por otra razón, ese es un hallazgo**: quiere decir que toca la base por un
camino que no pasa por el getter `client`, y hay que encontrar cuál.

- [ ] **Paso 2: el ayudante de tests**

`api/src/shared/testing/con-libro-de-prueba.ts`:

```ts
import { conLibro, type ContextoDeLibro } from '../../modules/identity/infrastructure/libro-context.js'

const LIBRO_DE_PRUEBA: ContextoDeLibro = {
  bookId: 'lib_test',
  userId: 'usr_test',
  rol: 'owner',
}

// Casi todos los tests no tienen nada que decir sobre libros: prueban contabilidad y
// necesitan un libro cualquiera para poder correr. Este ayudante les da uno sin que cada
// archivo repita el andamiaje.
//
// Los que sí prueban aislamiento NO usan esto: arman sus propios contextos a mano, porque ahí
// el libro es el sujeto del test y esconderlo detrás de un ayudante sería esconder lo que se
// está probando.
export const conLibroDePrueba = <T>(correr: () => Promise<T>): Promise<T> =>
  conLibro(LIBRO_DE_PRUEBA, correr)
```

- [ ] **Paso 3: aplicarlo archivo por archivo**

En cada spec que toque la base, envolver el cuerpo del test o usar un `beforeEach` que abra el
contexto. Y en el sembrado, crear el libro `lib_test` primero.

Va de a uno y no con un buscar-y-reemplazar: en cada archivo hay que mirar si el test tenía
algo que decir sobre pertenencia. Los que lo tengan se quedan con su contexto explícito.

- [ ] **Paso 4: la suite entera en verde**

```bash
cd api && npm test
```

- [ ] **Paso 5: commit**

```bash
git add api/src
git commit -m "✅ test: los 59 specs corren dentro de un libro"
```

---

### Tarea 7: Las guardias de rol

La extensión sabe *de qué libro*; no sabe si podés *escribir*. Alguien con rol `viewer`,
correctamente filtrado a su libro, editaría un movimiento si nadie chequea el rol. Es la
segunda capa del ADR-002 y lo que la skill de seguridad de addy marca como obligatorio.

**Archivos:**
- Crear: `api/src/modules/identity/infrastructure/rol.guard.ts`
- Crear: `api/src/modules/identity/infrastructure/rol.guard.spec.ts`
- Modificar: los controladores de los ocho módulos

**Interfaces:**
- Consume: `libroActual()` de la tarea 4 y los roles de la tarea 2.
- Produce: el decorador `@Permiso('movimiento', 'create')`.

- [ ] **Paso 1: escribir el test que falla**

```ts
import { describe, expect, it } from 'vitest'
import { puede } from './rol.guard.js'

describe('permisos por rol', () => {
  it('el que mira no crea', () => {
    expect(puede('viewer', 'movimiento', 'create')).toBe(false)
  })

  it('el que mira lee', () => {
    expect(puede('viewer', 'movimiento', 'read')).toBe(true)
  })

  it('el editor cierra meses', () => {
    expect(puede('editor', 'periodo', 'close')).toBe(true)
  })

  it('el editor no saca gente', () => {
    expect(puede('editor', 'member', 'delete')).toBe(false)
  })

  it('el dueño borra el libro', () => {
    expect(puede('owner', 'libro', 'delete')).toBe(true)
  })
})
```

- [ ] **Paso 2: correr y ver que falla**

- [ ] **Paso 3: escribir `puede` sobre los roles de la tarea 2, y el guard que lo usa**

El guard lee el permiso del decorador, saca el rol de `libroActual()`, y si `puede` devuelve
false responde **403**.

- [ ] **Paso 4: decorar los endpoints**

Uno por uno, en los ocho módulos. La regla: todo lo que escribe lleva permiso explícito; lo
que solo lee lleva el `read` de su recurso.

Al terminar, un test que recorra los controladores por reflexión y falle si algún método
`@Post`, `@Patch`, `@Put` o `@Delete` no tiene `@Permiso`. Sin eso, el endpoint número
cuarenta que alguien agregue dentro de seis meses va a quedar sin guardia y nadie se va a dar
cuenta.

- [ ] **Paso 5: la suite y commit**

```bash
cd api && npm test && npm run typecheck && npm run lint
```

```bash
git add api/src
git commit -m "🔒 feat: el rol decide qué se puede escribir, endpoint por endpoint"
```

---

### Tarea 8: Login y selector de libro

**Archivos:**
- Crear: `web/src/features/identity/auth-client.ts`
- Crear: `web/src/routes/entrar.tsx`
- Crear: `web/src/features/identity/selector-de-libro.tsx`
- Modificar: `web/src/features/shell/` (la barra lateral)
- Modificar: el cliente HTTP, para mandar `X-Libro`
- Modificar: `web/src/lib/observability.ts`, para `Sentry.setUser({ id })`

- [ ] **Paso 1: el cliente de auth**

Las rutas de Better Auth quedan fuera del OpenAPI (ADR-001), así que van tipadas a mano.
**En un solo archivo**, `auth-client.ts`, y nada más las toca: es la forma de que el costo
quede acotado en vez de desparramarse.

- [ ] **Paso 2: la pantalla de entrar**

Correo y contraseña. Sin enlace de registro, porque está cerrado. Sin «olvidé mi contraseña»,
porque todavía no existe ese camino: prometer un enlace que no manda nada es peor que no
ofrecerlo.

- [ ] **Paso 3: mandar el libro activo en cada petición**

El cliente HTTP suma la cabecera `X-Libro`. El libro activo se guarda en `localStorage`, con
`try/catch`, y si no hay o no vale, el guard del backend cae al único libro del usuario.

- [ ] **Paso 4: el selector**

En la barra lateral, arriba, donde hoy dice «Tape Ledger». Muestra el libro activo y despliega
los demás con su rol. Si hay uno solo, no se muestra: un selector de una opción es ruido.

Al cambiar de libro hay que **limpiar la caché de TanStack Query entera**. La caché indexa por
`queryKey` y ninguna clave incluye el libro, así que sin limpiarla el tablero mostraría las
cifras del libro anterior con el nombre del nuevo. Es el mismo error de `queryKey` que ya
apareció en la fase 5 con las fechas, y acá el síntoma es mucho peor.

- [ ] **Paso 5: identificar al usuario en Sentry**

Después de iniciar sesión, `Sentry.setUser({ id })`. Solo el id (ADR-005). Al cerrar sesión,
`Sentry.setUser(null)`.

- [ ] **Paso 6: barrido en el navegador**

Con dos usuarios y dos libros, verificar a 390, 768, 1024, 1280 y 1536 px: que el selector
entre, que cambiar de libro cambie las cifras, y que el usuario con rol `viewer` **no vea los
botones de escritura**. Ocultar el botón no es seguridad, la seguridad es la tarea 7; es que
una pantalla llena de botones que dan 403 es una pantalla rota.

- [ ] **Paso 7: commit**

```bash
git add web/src
git commit -m "✨ feat: entrar, y cambiar de libro sin que se mezclen las cifras"
```

---

## Autorrevisión

**Cobertura del spec:** sección 4 (modelo) en las tareas 2 y 3; sección 5 (aislamiento) en la
4, la 5 y la 7; sección 9 (API de libros) en la 4 y la 8; sección 10 (pantallas de login y
selector) en la 8. Los 59 specs que el spec anuncia como riesgo tienen su tarea, la 6.

**Lo que este plan NO cubre, y va en el tercero:** invitaciones y pantalla de miembros, audit
log, exportación, vaciar, eliminar cuenta con su verificación de libros huérfanos, y la
pantalla de historial. Todo eso se apoya en que la fundación exista, y varias de sus
decisiones concretas van a ser más claras con el aislamiento ya construido.

**Dos correcciones al spec que salieron al escribir el plan:**

1. **Son 18 tablas con `bookId`, no 19.** `ExchangeRate` guarda los tipos de cambio del BCCR,
   que son públicos y los mismos para todos. Duplicarlos por libro es guardar la misma tabla N
   veces. El spec decía 19 sin haber mirado tabla por tabla.

2. **Los índices existentes hay que reescribirlos con `bookId` adelante.** El spec decía
   «índice compuesto donde ya hay índices de consulta» sin decir el orden, y el orden es todo:
   un índice que no empiece por `bookId` no lo usa ninguna consulta, porque todas van a llevar
   ese filtro primero.

**Consistencia de nombres:** `libroActual`, `conLibro` y `ContextoDeLibro` se usan igual en las
tareas 4, 5, 6 y 7. `filtroDeLibro` solo lo consume `PrismaService`. `puede` solo lo consume
el guard de la tarea 7.

**Un riesgo que el plan no puede cerrar solo:** la tarea 1 puede invalidar el ADR-001 y obligar
a reescribir desde la tarea 2. Está marcada como bloqueante por eso, y la alternativa ya está
documentada en el ADR con sus pros y contras, así que si pasa no hay que volver a decidir
nada: solo registrarlo en un ADR-006 y reescribir.
