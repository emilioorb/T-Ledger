# Fase 1 · Rebanada 3 — Contabilidad · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contabilidad de partida doble completa: plan de cuentas jerárquico, movimientos que generan su asiento, mayor, comprobación, estado de situación y estado de resultados. Multimoneda, con la diferencia siempre a la vista.

**Architecture:** Módulo `accounting` con dominio rico. El plan de cuentas es un árbol con clases contables y saldo normal por clase. El asiento es la raíz de agregado que guarda la invariante contable. Los movimientos son la puerta de entrada: Emilio carga un gasto o un ingreso con su categoría, y el asiento sale de ahí. Los cuatro reportes se calculan desde los asientos y ninguno se almacena.

**Tech Stack:** El mismo de las rebanadas anteriores. Sin paquetes nuevos.

**Spec:** `docs/superpowers/specs/2026-09-20-finanzas-personales-design.md`, sección `accounting` dentro del punto 5

**Planes hermanos (ejecutar en este orden):**

1. `2026-09-20-fase1-fundacion-y-deudas.md`
2. `2026-09-20-fase1-tipos-de-cambio.md` (BCCR)
3. `2026-09-20-fase1-contabilidad.md`
4. `2026-09-20-fase1-presupuesto-metas-inversiones-proyeccion.md`

**Requiere:** las rebanadas 1 y 2 completas. Usa el kernel (`Money`, `Result`, `DateRange`), los bordes HTTP, el `PrismaService` y el conversor de monedas del módulo `money`.

---

## Global Constraints

Valen todas las restricciones de la rebanada 1: versiones pineadas, reglas de backend 1–11 y reglas de frontend F1–F12.

### Las cinco decisiones que gobiernan este módulo

**1. Las cuentas no tienen moneda; las líneas sí.**
El saldo de una cuenta se consulta siempre acotado a una moneda, y el mayor es «una cuenta en una moneda». Esto no es un detalle de reportes: es lo que permite registrar una conversión como dos tramos contra una cuenta puente de traslados entre monedas.

**2. La invariante es por moneda, no en total.**
Dentro de un asiento, para **cada** moneda presente, la suma de débitos iguala la suma de créditos. Un asiento de conversión cuadra en colones por un lado y en dólares por el otro, y su total mezclado no significa nada. Exigir que cuadre el total haría imposible registrar una conversión.

**3. El saldo se reporta con el signo de su saldo normal.**
Deudor para activo, costo y gasto; acreedor para pasivo, patrimonio e ingreso. Un activo con más créditos que débitos se muestra negativo, que es exactamente lo que se espera ver cuando una caja quedó sobregirada.

**4. Emilio no carga asientos: carga movimientos.**
Un gasto o un ingreso con su categoría, su contraparte y su cuenta de pago. El asiento es consecuencia del movimiento, no una entrada paralela. El asiento manual existe, pero para lo que no es un gasto o ingreso simple.

**5. Nada se borra: se anula.**
Anular un movimiento genera el asiento de reversión y marca el movimiento. El original y su reversión quedan los dos en el mayor. Borrar un asiento ya registrado destruye la única cosa que la contabilidad existe para dar, que es la trazabilidad.

### La identidad contable, sin asientos de cierre

`Activo = Pasivo + Patrimonio` se cumple exacto porque el patrimonio del estado de situación incluye el **resultado del período como línea derivada**, sumada a los saldos de las cuentas de patrimonio.

Sin esa línea, la identidad solo cuadraría después de correr asientos de cierre que lleven ingresos y gastos a resultados acumulados. Derivarla evita esa ceremonia entera y deja el cierre de período fuera de alcance sin que falte nada.

### Sobre las capturas de referencia

Las pantallas que Emilio compartió son referencia de **modelo y capacidades**, no de diseño. Su aspecto es precisamente la plantilla de administración genérica que las reglas F6 y F9 prohíben. Lo que se toma de ahí es qué datos existen y qué preguntas responde cada vista; el aspecto sale de `DESIGN.md` y de las skills de diseño.

### Plan de cuentas semilla

Seis raíces, una por clase contable. Es dato editable, no código:

| Código | Nombre | Clase |
|---|---|---|
| 1000 | Activos | `ASSET` |
| 2000 | Pasivos | `LIABILITY` |
| 3000 | Patrimonio | `EQUITY` |
| 4000 | Ingresos | `INCOME` |
| 5000 | Costo de ingresos | `COST_OF_REVENUE` |
| 6000 | Gastos operativos | `OPERATING_EXPENSE` |

Bajo ellas, la semilla incluye lo mínimo para poder asentar el primer movimiento: `1100` Efectivo y equivalentes con `1101` Caja colones, `1102` Caja dólares, `1111` Banco colones, `1112` Banco dólares y `1190` Traslados entre monedas; `1200` Cuentas por cobrar; `2100` Cuentas por pagar; `3110` Aportes y `3210` Resultados acumulados; `4100` Ingresos; `6100` Gastos generales.

`1190` es la cuenta puente: su saldo en cada moneda queda distinto de cero solo mientras una conversión esté a medio registrar, y ese es justamente su valor diagnóstico.

### Mapa de archivos

```
api/src/modules/accounting/
├── domain/
│   ├── account-class.ts          seis clases y su saldo normal
│   ├── account.ts                cuenta del plan
│   ├── chart-of-accounts.ts      árbol, validaciones y acumulación
│   ├── journal-entry.ts          raíz de agregado e invariante por moneda
│   ├── account-balance.ts        saldo con signo de saldo normal
│   ├── category.ts               puente categoría → cuenta
│   ├── movement.ts               gasto o ingreso, y su asiento
│   ├── reports/                  mayor, comprobación, situación, resultados
│   └── *.port.ts                 puertos de los cuatro repositorios
├── application/                  casos de uso
└── infrastructure/               Prisma, controladores, esquemas Zod, semilla
web/src/
├── routes/                       cuentas, categorias, movimientos, asientos,
│                                 mayor, comprobacion, situacion, resultados
└── features/accounting/
```

---

## Tareas

### Tarea 1: Plan de cuentas

**Descripción:** Las seis clases con su saldo normal, la cuenta y el árbol. Las validaciones que impiden un plan de cuentas incoherente: una cuenta no puede colgar de otra clase, el código determina el nivel, y solo se asienta contra hojas.

**Alcance:** M · **Dependencias:** kernel de la rebanada 1

**Files:**
- Create: `api/src/modules/accounting/domain/account-class.ts`, `account.ts`, `chart-of-accounts.ts`, `account-repository.port.ts`
- Test: `api/src/modules/accounting/domain/account-class.spec.ts`, `chart-of-accounts.spec.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `err` del kernel
- Produces:
  - `const ACCOUNT_CLASSES = ['ASSET','LIABILITY','EQUITY','INCOME','COST_OF_REVENUE','OPERATING_EXPENSE'] as const`, `type AccountClass`
  - `normalBalanceOf(accountClass): 'DEBIT' | 'CREDIT'`, `isResultClass(accountClass): boolean`, `rootCodeOf(accountClass): string`
  - `class Account`: `static create(props): Result<Account, RangeError>` · `readonly code, name, accountClass, parentCode, active, sortOrder` · `level(): number` · `isChildOf(code): boolean`
  - `class ChartOfAccounts`: `static create(accounts): Result<ChartOfAccounts, RangeError>` · `all()` · `byCode(code)` · `childrenOf(code)` · `isPostable(code): boolean` · `descendantsOf(code): Account[]` · `roots(): Account[]`

- [x] **Paso 1: Escribir el test de las clases que falla**

`api/src/modules/accounting/domain/account-class.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ACCOUNT_CLASSES, isResultClass, normalBalanceOf, rootCodeOf } from './account-class.js'

describe('AccountClass', () => {
  it('cubre las seis clases del plan', () => {
    expect(ACCOUNT_CLASSES).toEqual([
      'ASSET',
      'LIABILITY',
      'EQUITY',
      'INCOME',
      'COST_OF_REVENUE',
      'OPERATING_EXPENSE',
    ])
  })

  it('asigna saldo deudor a activo, costo y gasto', () => {
    expect(normalBalanceOf('ASSET')).toBe('DEBIT')
    expect(normalBalanceOf('COST_OF_REVENUE')).toBe('DEBIT')
    expect(normalBalanceOf('OPERATING_EXPENSE')).toBe('DEBIT')
  })

  it('asigna saldo acreedor a pasivo, patrimonio e ingreso', () => {
    expect(normalBalanceOf('LIABILITY')).toBe('CREDIT')
    expect(normalBalanceOf('EQUITY')).toBe('CREDIT')
    expect(normalBalanceOf('INCOME')).toBe('CREDIT')
  })

  it('reconoce las clases que forman el resultado del período', () => {
    expect(isResultClass('INCOME')).toBe(true)
    expect(isResultClass('COST_OF_REVENUE')).toBe(true)
    expect(isResultClass('OPERATING_EXPENSE')).toBe(true)
    expect(isResultClass('ASSET')).toBe(false)
    expect(isResultClass('LIABILITY')).toBe(false)
    expect(isResultClass('EQUITY')).toBe(false)
  })

  it('ancla cada clase a su código raíz', () => {
    expect(rootCodeOf('ASSET')).toBe('1000')
    expect(rootCodeOf('OPERATING_EXPENSE')).toBe('6000')
  })
})
```

- [x] **Paso 2: Escribir el test del árbol que falla**

`api/src/modules/accounting/domain/chart-of-accounts.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Account } from './account.js'
import { ChartOfAccounts } from './chart-of-accounts.js'

const cuenta = (
  code: string,
  name: string,
  accountClass: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'COST_OF_REVENUE' | 'OPERATING_EXPENSE',
  parentCode: string | null,
  active = true,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active, sortOrder: 0 }))

const plan = () =>
  unwrap(
    ChartOfAccounts.create([
      cuenta('1000', 'Activos', 'ASSET', null),
      cuenta('1100', 'Efectivo y equivalentes', 'ASSET', '1000'),
      cuenta('1101', 'Caja colones', 'ASSET', '1100'),
      cuenta('1102', 'Caja dólares', 'ASSET', '1100'),
      cuenta('1190', 'Traslados entre monedas', 'ASSET', '1100'),
      cuenta('2000', 'Pasivos', 'LIABILITY', null),
      cuenta('2110', 'Cuentas por pagar', 'LIABILITY', '2000'),
      cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
      cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000', false),
    ]),
  )

describe('Account', () => {
  it('sabe si tiene madre; la profundidad real la da el árbol', () => {
    expect(cuenta('1000', 'Activos', 'ASSET', null).level()).toBe(0)
    expect(cuenta('1101', 'Caja', 'ASSET', '1100').level()).toBe(1)
  })

  it('rechaza un código que no es numérico', () => {
    expect(
      isErr(
        Account.create({
          code: 'CAJA',
          name: 'Caja',
          accountClass: 'ASSET',
          parentCode: null,
          active: true,
          sortOrder: 0,
        }),
      ),
    ).toBe(true)
  })

  it('rechaza un nombre vacío', () => {
    expect(
      isErr(
        Account.create({
          code: '1101',
          name: '   ',
          accountClass: 'ASSET',
          parentCode: '1100',
          active: true,
          sortOrder: 0,
        }),
      ),
    ).toBe(true)
  })
})

describe('ChartOfAccounts', () => {
  it('encuentra una cuenta por su código', () => {
    expect(plan().byCode('1101')?.name).toBe('Caja colones')
    expect(plan().byCode('9999')).toBeUndefined()
  })

  it('lista las hijas directas de una cuenta', () => {
    expect(plan().childrenOf('1100').map((a) => a.code)).toEqual(['1101', '1102', '1190'])
  })

  it('lista todas las descendientes, no solo las hijas', () => {
    expect(plan().descendantsOf('1000').map((a) => a.code)).toEqual([
      '1100',
      '1101',
      '1102',
      '1190',
    ])
  })

  it('devuelve una raíz por clase presente', () => {
    expect(plan().roots().map((a) => a.code)).toEqual(['1000', '2000', '6000'])
  })

  it('cuenta la profundidad recorriendo el árbol hasta la raíz', () => {
    expect(plan().levelOf('1000')).toBe(0)
    expect(plan().levelOf('1100')).toBe(1)
    expect(plan().levelOf('1101')).toBe(2)
  })

  it('solo son asentables las cuentas hoja y activas', () => {
    expect(plan().isPostable('1101')).toBe(true)
    expect(plan().isPostable('1100')).toBe(false)
    expect(plan().isPostable('1000')).toBe(false)
    expect(plan().isPostable('6310')).toBe(false)
  })

  it('rechaza un plan con códigos repetidos', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1000', 'Activos', 'ASSET', null),
          cuenta('1000', 'Otra vez activos', 'ASSET', null),
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza una cuenta cuyo padre no existe', () => {
    expect(isErr(ChartOfAccounts.create([cuenta('1101', 'Caja', 'ASSET', '1100')]))).toBe(true)
  })

  it('rechaza una cuenta que cuelga de otra clase contable', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1000', 'Activos', 'ASSET', null),
          cuenta('1900', 'Gasto colgado de activo', 'OPERATING_EXPENSE', '1000'),
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza un ciclo en la jerarquía', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1100', 'A', 'ASSET', '1200'),
          cuenta('1200', 'B', 'ASSET', '1100'),
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza dos raíces de la misma clase', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1000', 'Activos', 'ASSET', null),
          cuenta('1500', 'Otros activos raíz', 'ASSET', null),
        ]),
      ),
    ).toBe(true)
  })
})
```

- [x] **Paso 3: Correr y confirmar que fallan**

```bash
cd api && npm test -- account-class chart-of-accounts
```

- [x] **Paso 4: Implementar las clases contables**

`api/src/modules/accounting/domain/account-class.ts`:

```ts
export const ACCOUNT_CLASSES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
] as const

export type AccountClass = (typeof ACCOUNT_CLASSES)[number]

export type NormalBalance = 'DEBIT' | 'CREDIT'

const NORMAL_BALANCE: Record<AccountClass, NormalBalance> = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
  COST_OF_REVENUE: 'DEBIT',
  OPERATING_EXPENSE: 'DEBIT',
}

const ROOT_CODE: Record<AccountClass, string> = {
  ASSET: '1000',
  LIABILITY: '2000',
  EQUITY: '3000',
  INCOME: '4000',
  COST_OF_REVENUE: '5000',
  OPERATING_EXPENSE: '6000',
}

// Las clases que forman el resultado del período. Su saldo no va al estado de situación:
// va al estado de resultados, y su neto entra a patrimonio como línea derivada.
const RESULT_CLASSES: ReadonlySet<AccountClass> = new Set([
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
])

export const normalBalanceOf = (accountClass: AccountClass): NormalBalance =>
  NORMAL_BALANCE[accountClass]

export const rootCodeOf = (accountClass: AccountClass): string => ROOT_CODE[accountClass]

export const isResultClass = (accountClass: AccountClass): boolean =>
  RESULT_CLASSES.has(accountClass)

export const isAccountClass = (value: string): value is AccountClass =>
  (ACCOUNT_CLASSES as readonly string[]).includes(value)
```

- [x] **Paso 5: Implementar la cuenta**

`api/src/modules/accounting/domain/account.ts`:

```ts
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { AccountClass } from './account-class.js'

export interface AccountProps {
  readonly code: string
  readonly name: string
  readonly accountClass: AccountClass
  readonly parentCode: string | null
  readonly active: boolean
  readonly sortOrder: number
}

export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(props: AccountProps): Result<Account, RangeError> {
    if (!/^\d{3,10}$/.test(props.code)) {
      return err(new RangeError(`El código de cuenta debe ser numérico, se recibió «${props.code}»`))
    }
    if (props.name.trim().length === 0) {
      return err(new RangeError('La cuenta necesita un nombre'))
    }
    if (props.parentCode !== null && props.parentCode === props.code) {
      return err(new RangeError('Una cuenta no puede ser su propia madre'))
    }
    return ok(new Account({ ...props, name: props.name.trim() }))
  }

  get code(): string { return this.props.code }
  get name(): string { return this.props.name }
  get accountClass(): AccountClass { return this.props.accountClass }
  get parentCode(): string | null { return this.props.parentCode }
  get active(): boolean { return this.props.active }
  get sortOrder(): number { return this.props.sortOrder }

  isChildOf(code: string): boolean {
    return this.props.parentCode === code
  }

  // El nivel se completa desde el árbol; una cuenta suelta solo sabe si tiene madre.
  level(): number {
    return this.props.parentCode === null ? 0 : 1
  }

  toProps(): AccountProps {
    return { ...this.props }
  }
}
```

- [x] **Paso 6: Implementar el árbol**

`api/src/modules/accounting/domain/chart-of-accounts.ts`:

```ts
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { Account } from './account.js'
import type { AccountClass } from './account-class.js'

export class ChartOfAccounts {
  private constructor(
    private readonly accounts: readonly Account[],
    private readonly index: ReadonlyMap<string, Account>,
  ) {}

  static create(accounts: readonly Account[]): Result<ChartOfAccounts, RangeError> {
    const index = new Map<string, Account>()
    for (const account of accounts) {
      if (index.has(account.code)) {
        return err(new RangeError(`El código ${account.code} está repetido en el plan de cuentas`))
      }
      index.set(account.code, account)
    }

    const roots = new Set<AccountClass>()
    for (const account of accounts) {
      if (account.parentCode === null) {
        if (roots.has(account.accountClass)) {
          return err(
            new RangeError(`La clase ${account.accountClass} no puede tener dos cuentas raíz`),
          )
        }
        roots.add(account.accountClass)
        continue
      }

      const parent = index.get(account.parentCode)
      if (!parent) {
        return err(
          new RangeError(`La cuenta ${account.code} cuelga de ${account.parentCode}, que no existe`),
        )
      }
      if (parent.accountClass !== account.accountClass) {
        return err(
          new RangeError(
            `La cuenta ${account.code} es ${account.accountClass} y cuelga de ${parent.code}, que es ${parent.accountClass}`,
          ),
        )
      }
    }

    const cycle = findCycle(accounts, index)
    if (cycle) return err(new RangeError(`La jerarquía tiene un ciclo en ${cycle}`))

    return ok(new ChartOfAccounts(accounts, index))
  }

  all(): readonly Account[] {
    return this.accounts
  }

  byCode(code: string): Account | undefined {
    return this.index.get(code)
  }

  roots(): Account[] {
    return this.sorted(this.accounts.filter((account) => account.parentCode === null))
  }

  childrenOf(code: string): Account[] {
    return this.sorted(this.accounts.filter((account) => account.isChildOf(code)))
  }

  descendantsOf(code: string): Account[] {
    return this.childrenOf(code).flatMap((child) => [child, ...this.descendantsOf(child.code)])
  }

  // Solo se asienta contra hojas activas: una agrupadora acumula, no recibe.
  isPostable(code: string): boolean {
    const account = this.index.get(code)
    if (!account || !account.active) return false
    return this.childrenOf(code).length === 0
  }

  levelOf(code: string): number {
    let level = 0
    let current = this.index.get(code)
    while (current?.parentCode) {
      level += 1
      current = this.index.get(current.parentCode)
    }
    return level
  }

  private sorted(accounts: Account[]): Account[] {
    return [...accounts].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
    )
  }
}

const findCycle = (
  accounts: readonly Account[],
  index: ReadonlyMap<string, Account>,
): string | null => {
  for (const account of accounts) {
    const seen = new Set<string>([account.code])
    let current = account.parentCode
    while (current !== null) {
      if (seen.has(current)) return current
      seen.add(current)
      current = index.get(current)?.parentCode ?? null
    }
  }
  return null
}
```

- [x] **Paso 7: Puerto del repositorio**

`api/src/modules/accounting/domain/account-repository.port.ts`:

```ts
import type { Account } from './account.js'
import type { ChartOfAccounts } from './chart-of-accounts.js'

export interface AccountRepository {
  loadChart(): Promise<ChartOfAccounts>
  findByCode(code: string): Promise<Account | null>
  save(account: Account): Promise<void>
  saveMany(accounts: readonly Account[]): Promise<void>
}

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY')
```

- [x] **Paso 8: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/accounting
git commit -m "✨ feat: plan de cuentas jerárquico con seis clases contables"
```

**Acceptance criteria:**
- [x] Las seis clases tienen el saldo normal correcto
- [x] Una cuenta que cuelga de otra clase contable es rechazada
- [x] Un ciclo en la jerarquía es rechazado
- [x] Dos raíces de la misma clase son rechazadas
- [x] Solo las hojas activas son asentables
- [x] Ningún archivo del dominio importa Nest, Prisma ni HTTP

---

### Tarea 2: Asiento de partida doble

**Descripción:** La raíz de agregado que guarda la invariante contable. Es el corazón del módulo: si el asiento acepta quedar descuadrado, ningún reporte de más arriba significa nada. La invariante es **por moneda**, no en total, y ese es el punto que hace posible registrar una conversión.

**Alcance:** M · **Dependencias:** Tarea 1

**Files:**
- Create: `api/src/modules/accounting/domain/journal-entry.ts`, `account-balance.ts`, `journal-repository.port.ts`
- Test: `api/src/modules/accounting/domain/journal-entry.spec.ts`, `account-balance.spec.ts`

**Interfaces:**
- Consumes: `Money`, `CurrencyCode`, `Result`, `ChartOfAccounts`, `AccountClass`
- Produces:
  - `type EntrySide = 'DEBIT' | 'CREDIT'`
  - `interface JournalLine { accountCode: string; amount: Money; side: EntrySide }`
  - `interface JournalEntryProps { id: string; date: Date; description: string; reference: string | null; lines: readonly JournalLine[]; sourceMovementId: string | null; reversesEntryId: string | null }`
  - `class JournalEntry`: `static create(props, chart: ChartOfAccounts): Result<JournalEntry, RangeError>` · getters · `currencies(): CurrencyCode[]` · `totalFor(currency, side): Money` · `linesFor(accountCode, currency): JournalLine[]` · `reverse(id: string, at: Date): JournalEntry` · `toProps()`
  - `signedBalance(debits: Money, credits: Money, accountClass: AccountClass): Money`
  - `const JOURNAL_REPOSITORY: unique symbol`, `interface JournalRepository`

- [x] **Paso 1: Escribir el test del asiento que falla**

`api/src/modules/accounting/domain/journal-entry.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Account } from './account.js'
import { ChartOfAccounts } from './chart-of-accounts.js'
import { JournalEntry, type JournalLine } from './journal-entry.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const usd = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'USD')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const cuenta = (
  code: string,
  name: string,
  accountClass: 'ASSET' | 'OPERATING_EXPENSE',
  parentCode: string | null,
  active = true,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1100', 'Efectivo', 'ASSET', '1000'),
    cuenta('1101', 'Caja colones', 'ASSET', '1100'),
    cuenta('1102', 'Caja dólares', 'ASSET', '1100'),
    cuenta('1190', 'Traslados entre monedas', 'ASSET', '1100'),
    cuenta('1199', 'Cuenta cerrada', 'ASSET', '1100', false),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000'),
  ]),
)

const entry = (lines: JournalLine[], id = 'a1') =>
  JournalEntry.create(
    {
      id,
      date: utc('2026-09-16'),
      description: 'Asiento de prueba',
      reference: null,
      lines,
      sourceMovementId: null,
      reversesEntryId: null,
    },
    chart,
  )

describe('JournalEntry', () => {
  it('acepta un asiento que cuadra en una moneda', () => {
    const result = entry([
      { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(false)
  })

  it('rechaza un asiento descuadrado', () => {
    const result = entry([
      { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(19_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('acepta un asiento multimoneda que cuadra en cada moneda por separado', () => {
    // Conversión: salen colones contra la cuenta puente, entran dólares contra la misma.
    const result = entry([
      { accountCode: '1190', amount: crc(508_000_00n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(508_000_00n), side: 'CREDIT' },
      { accountCode: '1102', amount: usd(1_000_00n), side: 'DEBIT' },
      { accountCode: '1190', amount: usd(1_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(false)
  })

  it('rechaza un asiento que cuadra en total pero no en cada moneda', () => {
    const result = entry([
      { accountCode: '6310', amount: crc(1_000_00n), side: 'DEBIT' },
      { accountCode: '1102', amount: usd(1_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un asiento con menos de dos líneas', () => {
    expect(isErr(entry([{ accountCode: '1101', amount: crc(100n), side: 'DEBIT' }]))).toBe(true)
    expect(isErr(entry([]))).toBe(true)
  })

  it('rechaza un asiento contra una cuenta agrupadora', () => {
    const result = entry([
      { accountCode: '1100', amount: crc(100n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un asiento contra una cuenta inactiva', () => {
    const result = entry([
      { accountCode: '1199', amount: crc(100n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un asiento contra una cuenta que no existe', () => {
    const result = entry([
      { accountCode: '9999', amount: crc(100n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza una línea de monto cero o negativo', () => {
    expect(
      isErr(
        entry([
          { accountCode: '6310', amount: crc(0n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(0n), side: 'CREDIT' },
        ]),
      ),
    ).toBe(true)
    expect(
      isErr(
        entry([
          { accountCode: '6310', amount: crc(-100n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(-100n), side: 'CREDIT' },
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza una descripción vacía', () => {
    const result = JournalEntry.create(
      {
        id: 'a2',
        date: utc('2026-09-16'),
        description: '   ',
        reference: null,
        lines: [
          { accountCode: '6310', amount: crc(100n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
        ],
        sourceMovementId: null,
        reversesEntryId: null,
      },
      chart,
    )

    expect(isErr(result)).toBe(true)
  })

  it('reporta las monedas presentes y los totales por lado', () => {
    const asiento = unwrap(
      entry([
        { accountCode: '1190', amount: crc(508_000_00n), side: 'DEBIT' },
        { accountCode: '1101', amount: crc(508_000_00n), side: 'CREDIT' },
        { accountCode: '1102', amount: usd(1_000_00n), side: 'DEBIT' },
        { accountCode: '1190', amount: usd(1_000_00n), side: 'CREDIT' },
      ]),
    )

    expect(asiento.currencies()).toEqual(['CRC', 'USD'])
    expect(asiento.totalFor('CRC', 'DEBIT').minorUnits).toBe(508_000_00n)
    expect(asiento.totalFor('USD', 'CREDIT').minorUnits).toBe(1_000_00n)
  })

  it('la reversión invierte cada lado y apunta al asiento original', () => {
    const original = unwrap(
      entry([
        { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
        { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
      ]),
    )

    const reversa = original.reverse('a1-rev', utc('2026-09-20'))

    expect(reversa.reversesEntryId).toBe('a1')
    expect(reversa.date.toISOString()).toBe('2026-09-20T00:00:00.000Z')
    expect(reversa.lines.map((l) => [l.accountCode, l.side])).toEqual([
      ['6310', 'CREDIT'],
      ['1101', 'DEBIT'],
    ])
  })

  it('la reversión de una reversión vuelve al asiento original', () => {
    const original = unwrap(
      entry([
        { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
        { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
      ]),
    )

    const doble = original.reverse('rev', utc('2026-09-20')).reverse('rev2', utc('2026-09-21'))

    expect(doble.lines.map((l) => l.side)).toEqual(['DEBIT', 'CREDIT'])
  })
})
```

El test de «cuadra en total pero no en cada moneda» es el que fija la regla. Un asiento con ₡1.000 al débito y US$1.000 al crédito tiene dos líneas, un débito y un crédito, y sería aceptado por cualquier implementación que sume sin mirar la moneda. Es exactamente el error que hay que prevenir.

- [x] **Paso 2: Escribir el test del saldo con signo**

`api/src/modules/accounting/domain/account-balance.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { signedBalance } from './account-balance.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')

describe('signedBalance', () => {
  it('una cuenta deudora con más débitos queda positiva', () => {
    expect(signedBalance(crc(1_000n), crc(400n), 'ASSET').minorUnits).toBe(600n)
  })

  it('una cuenta deudora con más créditos queda negativa', () => {
    expect(signedBalance(crc(0n), crc(219_698_00n), 'ASSET').minorUnits).toBe(-219_698_00n)
  })

  it('una cuenta acreedora con más créditos queda positiva', () => {
    expect(signedBalance(crc(0n), crc(500_000_00n), 'LIABILITY').minorUnits).toBe(500_000_00n)
  })

  it('una cuenta acreedora con más débitos queda negativa', () => {
    expect(signedBalance(crc(700n), crc(200n), 'INCOME').minorUnits).toBe(-500n)
  })

  it('aplica el signo correcto a las seis clases', () => {
    const debits = crc(1_000n)
    const credits = crc(300n)

    expect(signedBalance(debits, credits, 'ASSET').minorUnits).toBe(700n)
    expect(signedBalance(debits, credits, 'COST_OF_REVENUE').minorUnits).toBe(700n)
    expect(signedBalance(debits, credits, 'OPERATING_EXPENSE').minorUnits).toBe(700n)
    expect(signedBalance(debits, credits, 'LIABILITY').minorUnits).toBe(-700n)
    expect(signedBalance(debits, credits, 'EQUITY').minorUnits).toBe(-700n)
    expect(signedBalance(debits, credits, 'INCOME').minorUnits).toBe(-700n)
  })
})
```

Los números de la primera cuenta acreedora y de la deudora negativa salen de las capturas de referencia: caja en colones con saldo −219 698,00 y cuentas por pagar con 500 000,00. Si el signo estuviera invertido, esos dos casos lo dirían.

- [x] **Paso 3: Correr y confirmar que fallan**

```bash
cd api && npm test -- journal-entry account-balance
```

- [x] **Paso 4: Implementar el saldo con signo**

`api/src/modules/accounting/domain/account-balance.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { normalBalanceOf, type AccountClass } from './account-class.js'

// El saldo se reporta con el signo de su saldo normal: un activo con más créditos
// que débitos se ve negativo, que es lo que se espera de una caja sobregirada.
export const signedBalance = (
  debits: Money,
  credits: Money,
  accountClass: AccountClass,
): Money =>
  normalBalanceOf(accountClass) === 'DEBIT'
    ? unwrap(debits.subtract(credits))
    : unwrap(credits.subtract(debits))
```

- [x] **Paso 5: Implementar el asiento**

`api/src/modules/accounting/domain/journal-entry.ts`:

```ts
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import type { ChartOfAccounts } from './chart-of-accounts.js'

export type EntrySide = 'DEBIT' | 'CREDIT'

export interface JournalLine {
  readonly accountCode: string
  readonly amount: Money
  readonly side: EntrySide
}

export interface JournalEntryProps {
  readonly id: string
  readonly date: Date
  readonly description: string
  readonly reference: string | null
  readonly lines: readonly JournalLine[]
  readonly sourceMovementId: string | null
  readonly reversesEntryId: string | null
}

const MIN_LINES = 2

export class JournalEntry {
  private constructor(private readonly props: JournalEntryProps) {}

  static create(
    props: JournalEntryProps,
    chart: ChartOfAccounts,
  ): Result<JournalEntry, RangeError> {
    if (props.lines.length < MIN_LINES) {
      return err(new RangeError('Un asiento necesita al menos dos líneas'))
    }
    if (props.description.trim().length === 0) {
      return err(new RangeError('El asiento necesita una descripción'))
    }

    for (const line of props.lines) {
      if (line.amount.isZero() || line.amount.isNegative()) {
        return err(
          new RangeError(`La línea contra ${line.accountCode} debe tener un monto mayor que cero`),
        )
      }
      const account = chart.byCode(line.accountCode)
      if (!account) {
        return err(new RangeError(`La cuenta ${line.accountCode} no existe en el plan`))
      }
      if (!chart.isPostable(line.accountCode)) {
        return err(
          new RangeError(
            `La cuenta ${line.accountCode} no acepta asientos: es agrupadora o está inactiva`,
          ),
        )
      }
    }

    // La invariante es por moneda. Un asiento de conversión cuadra en colones por un lado
    // y en dólares por el otro; su total mezclado no significa nada.
    for (const currency of currenciesOf(props.lines)) {
      const debits = totalOf(props.lines, currency, 'DEBIT')
      const credits = totalOf(props.lines, currency, 'CREDIT')
      if (!debits.equals(credits)) {
        return err(
          new RangeError(
            `El asiento no cuadra en ${currency}: débitos ${debits.minorUnits} contra créditos ${credits.minorUnits}`,
          ),
        )
      }
    }

    return ok(new JournalEntry({ ...props, description: props.description.trim() }))
  }

  get id(): string { return this.props.id }
  get date(): Date { return this.props.date }
  get description(): string { return this.props.description }
  get reference(): string | null { return this.props.reference }
  get lines(): readonly JournalLine[] { return this.props.lines }
  get sourceMovementId(): string | null { return this.props.sourceMovementId }
  get reversesEntryId(): string | null { return this.props.reversesEntryId }

  currencies(): CurrencyCode[] {
    return currenciesOf(this.props.lines)
  }

  totalFor(currency: CurrencyCode, side: EntrySide): Money {
    return totalOf(this.props.lines, currency, side)
  }

  linesFor(accountCode: string, currency: CurrencyCode): JournalLine[] {
    return this.props.lines.filter(
      (line) => line.accountCode === accountCode && line.amount.currency === currency,
    )
  }

  // Anular no borra: se registra el espejo, y los dos quedan en el mayor.
  reverse(id: string, at: Date): JournalEntry {
    return new JournalEntry({
      id,
      date: at,
      description: `Reversión de: ${this.props.description}`,
      reference: this.props.reference,
      lines: this.props.lines.map((line) => ({
        ...line,
        side: line.side === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      })),
      sourceMovementId: this.props.sourceMovementId,
      reversesEntryId: this.props.id,
    })
  }

  toProps(): JournalEntryProps {
    return { ...this.props, lines: [...this.props.lines] }
  }
}

const currenciesOf = (lines: readonly JournalLine[]): CurrencyCode[] =>
  [...new Set(lines.map((line) => line.amount.currency))].sort()

const totalOf = (
  lines: readonly JournalLine[],
  currency: CurrencyCode,
  side: EntrySide,
): Money =>
  lines
    .filter((line) => line.amount.currency === currency && line.side === side)
    .reduce((acc, line) => unwrap(acc.add(line.amount)), Money.zero(currency))
```

- [x] **Paso 6: Puerto del repositorio de asientos**

`api/src/modules/accounting/domain/journal-repository.port.ts`:

```ts
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { JournalEntry } from './journal-entry.js'

export interface AccountMovementTotals {
  readonly accountCode: string
  readonly debits: bigint
  readonly credits: bigint
}

export interface JournalRepository {
  save(entry: JournalEntry): Promise<void>
  findById(id: string): Promise<JournalEntry | null>
  findByMovementId(movementId: string): Promise<JournalEntry[]>
  findInRange(range: DateRange, page: number, pageSize: number): Promise<{ items: JournalEntry[]; totalItems: number }>

  // Los reportes no traen los asientos a memoria: agregan en la base.
  totalsByAccount(currency: CurrencyCode, range: DateRange): Promise<AccountMovementTotals[]>
  totalsUpTo(currency: CurrencyCode, at: Date): Promise<AccountMovementTotals[]>
  ledgerFor(accountCode: string, currency: CurrencyCode, range: DateRange): Promise<JournalEntry[]>
  openingBalanceFor(accountCode: string, currency: CurrencyCode, before: Date): Promise<{ debits: bigint; credits: bigint }>
}

export const JOURNAL_REPOSITORY = Symbol('JOURNAL_REPOSITORY')
```

Los reportes agregan en la base, no en memoria. Una comprobación de doce meses sobre un libro con miles de asientos no puede traérselos todos para sumarlos en Node.

- [x] **Paso 7: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/accounting
git commit -m "✨ feat: asiento de partida doble con invariante por moneda"
```

**Acceptance criteria:**
- [x] Un asiento descuadrado en alguna moneda es rechazado
- [x] Un asiento multimoneda que cuadra por moneda es aceptado
- [x] Un asiento que cuadra en total pero no por moneda es rechazado
- [x] Un asiento contra una cuenta agrupadora o inactiva es rechazado
- [x] Las líneas de monto cero o negativo son rechazadas
- [x] La reversión invierte los lados y apunta al asiento original
- [x] El saldo con signo es correcto en las seis clases

---

### Tarea 3: Categorías y movimientos

**Descripción:** La puerta de entrada real. Emilio carga un gasto o un ingreso con su categoría; el asiento sale de ahí. Una categoría sin cuenta mapeada produce un movimiento válido pero no contabilizado, y eso se reporta en lugar de fallar. Anular genera la reversión.

**Alcance:** M · **Dependencias:** Tarea 2

**Files:**
- Create: `api/src/modules/accounting/domain/category.ts`, `movement.ts`, `movement-posting.ts`, `category-repository.port.ts`, `movement-repository.port.ts`
- Test: `api/src/modules/accounting/domain/movement.spec.ts`, `movement-posting.spec.ts`

**Interfaces:**
- Produces:
  - `type CategoryKind = 'EXPENSE' | 'INCOME'`
  - `class Category`: `static create(props): Result<Category, RangeError>` · `readonly id, name, kind, accountCode: string | null, sortOrder, active` · `isPostable(): boolean`
  - `type MovementStatus = 'ACTIVE' | 'VOIDED'`
  - `class Movement`: `static create(props): Result<Movement, RangeError>` · `readonly id, date, kind, categoryId, counterparty, amount: Money, paymentAccountCode: string | null, receiptUrl: string | null, status` · `void_(): Movement` · `isVoided(): boolean`
  - `postingFor(movement, category, chart, entryId): Result<JournalEntry | null, RangeError>` — `null` cuando el movimiento no es contabilizable
  - `const CATEGORY_REPOSITORY`, `const MOVEMENT_REPOSITORY`

- [x] **Paso 1: Escribir el test de contabilización que falla**

`api/src/modules/accounting/domain/movement-posting.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Account } from './account.js'
import { Category } from './category.js'
import { ChartOfAccounts } from './chart-of-accounts.js'
import { Movement } from './movement.js'
import { postingFor } from './movement-posting.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const cuenta = (
  code: string,
  name: string,
  accountClass: 'ASSET' | 'INCOME' | 'OPERATING_EXPENSE',
  parentCode: string | null,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active: true, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1100', 'Efectivo', 'ASSET', '1000'),
    cuenta('1101', 'Caja colones', 'ASSET', '1100'),
    cuenta('4000', 'Ingresos', 'INCOME', null),
    cuenta('4110', 'Ingresos por suscripciones', 'INCOME', '4000'),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6210', 'Marketing y publicidad', 'OPERATING_EXPENSE', '6000'),
  ]),
)

const categoria = (kind: 'EXPENSE' | 'INCOME', accountCode: string | null) =>
  unwrap(
    Category.create({ id: 'c1', name: 'Marketing', kind, accountCode, sortOrder: 0, active: true }),
  )

const movimiento = (overrides: Partial<Parameters<typeof Movement.create>[0]> = {}) =>
  unwrap(
    Movement.create({
      id: 'm1',
      date: utc('2026-09-16'),
      kind: 'EXPENSE',
      categoryId: 'c1',
      counterparty: 'Anthropic',
      amount: crc(20_000_00n),
      paymentAccountCode: '1101',
      receiptUrl: null,
      status: 'ACTIVE',
      ...overrides,
    }),
  )

describe('postingFor', () => {
  it('un gasto debita la cuenta de la categoría y acredita la de pago', () => {
    const entry = unwrap(postingFor(movimiento(), categoria('EXPENSE', '6210'), chart, 'a1'))

    expect(entry?.lines.map((l) => [l.accountCode, l.side, l.amount.minorUnits])).toEqual([
      ['6210', 'DEBIT', 20_000_00n],
      ['1101', 'CREDIT', 20_000_00n],
    ])
    expect(entry?.sourceMovementId).toBe('m1')
  })

  it('un ingreso acredita la cuenta de la categoría y debita la de cobro', () => {
    const entry = unwrap(
      postingFor(
        movimiento({ kind: 'INCOME', counterparty: 'Sponsors' }),
        categoria('INCOME', '4110'),
        chart,
        'a2',
      ),
    )

    expect(entry?.lines.map((l) => [l.accountCode, l.side])).toEqual([
      ['1101', 'DEBIT'],
      ['4110', 'CREDIT'],
    ])
  })

  it('una categoría sin cuenta produce un movimiento sin asiento, no un error', () => {
    const result = postingFor(movimiento(), categoria('EXPENSE', null), chart, 'a3')

    expect(isErr(result)).toBe(false)
    expect(unwrap(result)).toBeNull()
  })

  it('un movimiento sin cuenta de pago tampoco se contabiliza', () => {
    const result = postingFor(
      movimiento({ paymentAccountCode: null }),
      categoria('EXPENSE', '6210'),
      chart,
      'a4',
    )

    expect(unwrap(result)).toBeNull()
  })

  it('el asiento cuadra siempre, por construcción', () => {
    const entry = unwrap(postingFor(movimiento(), categoria('EXPENSE', '6210'), chart, 'a5'))

    expect(entry?.totalFor('CRC', 'DEBIT').minorUnits).toBe(
      entry?.totalFor('CRC', 'CREDIT').minorUnits,
    )
  })

  it('falla si el tipo del movimiento no coincide con el de su categoría', () => {
    expect(isErr(postingFor(movimiento(), categoria('INCOME', '4110'), chart, 'a6'))).toBe(true)
  })

  it('falla si la cuenta de la categoría no acepta asientos', () => {
    expect(isErr(postingFor(movimiento(), categoria('EXPENSE', '6000'), chart, 'a7'))).toBe(true)
  })

  it('no contabiliza un movimiento anulado', () => {
    const result = postingFor(
      movimiento({ status: 'VOIDED' }),
      categoria('EXPENSE', '6210'),
      chart,
      'a8',
    )

    expect(unwrap(result)).toBeNull()
  })
})
```

- [x] **Paso 2: Escribir el test del movimiento**

`api/src/modules/accounting/domain/movement.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Category } from './category.js'
import { Movement } from './movement.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const props = (overrides = {}) => ({
  id: 'm1',
  date: utc('2026-09-16'),
  kind: 'EXPENSE' as const,
  categoryId: 'c1',
  counterparty: 'Anthropic',
  amount: crc(20_000_00n),
  paymentAccountCode: '1101',
  receiptUrl: null,
  status: 'ACTIVE' as const,
  ...overrides,
})

describe('Movement', () => {
  it('rechaza un monto de cero o negativo', () => {
    expect(isErr(Movement.create(props({ amount: crc(0n) })))).toBe(true)
    expect(isErr(Movement.create(props({ amount: crc(-1n) })))).toBe(true)
  })

  it('rechaza una contraparte vacía', () => {
    expect(isErr(Movement.create(props({ counterparty: '  ' })))).toBe(true)
  })

  it('anular devuelve un movimiento nuevo, sin mutar el original', () => {
    const original = unwrap(Movement.create(props()))
    const anulado = original.void_()

    expect(anulado.isVoided()).toBe(true)
    expect(original.isVoided()).toBe(false)
  })

  it('anular dos veces no cambia nada la segunda', () => {
    const anulado = unwrap(Movement.create(props())).void_()
    expect(anulado.void_().isVoided()).toBe(true)
  })
})

describe('Category', () => {
  it('es contabilizable solo si tiene cuenta y está activa', () => {
    const base = { id: 'c1', name: 'Marketing', kind: 'EXPENSE' as const, sortOrder: 0 }

    expect(unwrap(Category.create({ ...base, accountCode: '6210', active: true })).isPostable()).toBe(true)
    expect(unwrap(Category.create({ ...base, accountCode: null, active: true })).isPostable()).toBe(false)
    expect(unwrap(Category.create({ ...base, accountCode: '6210', active: false })).isPostable()).toBe(false)
  })

  it('rechaza un nombre vacío', () => {
    expect(
      isErr(
        Category.create({ id: 'c1', name: ' ', kind: 'EXPENSE', accountCode: null, sortOrder: 0, active: true }),
      ),
    ).toBe(true)
  })
})
```

- [x] **Paso 3: Correr y confirmar que fallan**

```bash
cd api && npm test -- movement category
```

- [x] **Paso 4: Implementar la categoría**

`api/src/modules/accounting/domain/category.ts`:

```ts
import { err, ok, type Result } from '../../../shared/kernel/result.js'

export type CategoryKind = 'EXPENSE' | 'INCOME'

export interface CategoryProps {
  readonly id: string
  readonly name: string
  readonly kind: CategoryKind
  // Sin cuenta, los movimientos de esta categoría se registran pero no se contabilizan.
  readonly accountCode: string | null
  readonly sortOrder: number
  readonly active: boolean
}

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(props: CategoryProps): Result<Category, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('La categoría necesita un nombre'))
    }
    return ok(new Category({ ...props, name: props.name.trim() }))
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get kind(): CategoryKind { return this.props.kind }
  get accountCode(): string | null { return this.props.accountCode }
  get sortOrder(): number { return this.props.sortOrder }
  get active(): boolean { return this.props.active }

  isPostable(): boolean {
    return this.props.accountCode !== null && this.props.active
  }

  toProps(): CategoryProps {
    return { ...this.props }
  }
}
```

- [x] **Paso 5: Implementar el movimiento**

`api/src/modules/accounting/domain/movement.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { CategoryKind } from './category.js'

export type MovementStatus = 'ACTIVE' | 'VOIDED'

export interface MovementProps {
  readonly id: string
  readonly date: Date
  readonly kind: CategoryKind
  readonly categoryId: string
  readonly counterparty: string
  readonly amount: Money
  readonly paymentAccountCode: string | null
  readonly receiptUrl: string | null
  readonly status: MovementStatus
}

export class Movement {
  private constructor(private readonly props: MovementProps) {}

  static create(props: MovementProps): Result<Movement, RangeError> {
    if (props.amount.isZero() || props.amount.isNegative()) {
      return err(new RangeError('El monto de un movimiento debe ser mayor que cero'))
    }
    if (props.counterparty.trim().length === 0) {
      return err(new RangeError('El movimiento necesita un proveedor o una fuente'))
    }
    if (Number.isNaN(props.date.getTime())) {
      return err(new RangeError('El movimiento recibió una fecha inválida'))
    }
    return ok(new Movement({ ...props, counterparty: props.counterparty.trim() }))
  }

  get id(): string { return this.props.id }
  get date(): Date { return this.props.date }
  get kind(): CategoryKind { return this.props.kind }
  get categoryId(): string { return this.props.categoryId }
  get counterparty(): string { return this.props.counterparty }
  get amount(): Money { return this.props.amount }
  get paymentAccountCode(): string | null { return this.props.paymentAccountCode }
  get receiptUrl(): string | null { return this.props.receiptUrl }
  get status(): MovementStatus { return this.props.status }

  isVoided(): boolean {
    return this.props.status === 'VOIDED'
  }

  // Un movimiento no se borra. Anularlo produce uno nuevo marcado, y su asiento
  // de reversión queda junto al original en el mayor.
  void_(): Movement {
    return new Movement({ ...this.props, status: 'VOIDED' })
  }

  toProps(): MovementProps {
    return { ...this.props }
  }
}
```

- [x] **Paso 6: Implementar la contabilización**

`api/src/modules/accounting/domain/movement-posting.ts`:

```ts
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { Category } from './category.js'
import type { ChartOfAccounts } from './chart-of-accounts.js'
import { JournalEntry, type JournalLine } from './journal-entry.js'
import type { Movement } from './movement.js'

// Devuelve null cuando el movimiento es válido pero no contabilizable: categoría sin
// cuenta, sin cuenta de pago, o movimiento anulado. No es un error, es un estado.
export const postingFor = (
  movement: Movement,
  category: Category,
  chart: ChartOfAccounts,
  entryId: string,
): Result<JournalEntry | null, RangeError> => {
  if (movement.kind !== category.kind) {
    return err(
      new RangeError(
        `El movimiento es ${movement.kind} y su categoría es ${category.kind}`,
      ),
    )
  }
  if (movement.isVoided()) return ok(null)
  if (!category.isPostable() || movement.paymentAccountCode === null) return ok(null)

  const categoryAccount = category.accountCode
  if (categoryAccount === null) return ok(null)

  if (!chart.isPostable(categoryAccount)) {
    return err(
      new RangeError(`La cuenta ${categoryAccount} de la categoría no acepta asientos`),
    )
  }

  // Un gasto debita la cuenta de la categoría y acredita la de pago; un ingreso, al revés.
  const lines: JournalLine[] =
    movement.kind === 'EXPENSE'
      ? [
          { accountCode: categoryAccount, amount: movement.amount, side: 'DEBIT' },
          { accountCode: movement.paymentAccountCode, amount: movement.amount, side: 'CREDIT' },
        ]
      : [
          { accountCode: movement.paymentAccountCode, amount: movement.amount, side: 'DEBIT' },
          { accountCode: categoryAccount, amount: movement.amount, side: 'CREDIT' },
        ]

  const entry = JournalEntry.create(
    {
      id: entryId,
      date: movement.date,
      description: `${category.name} · ${movement.counterparty}`,
      reference: movement.receiptUrl,
      lines,
      sourceMovementId: movement.id,
      reversesEntryId: null,
    },
    chart,
  )

  return entry.ok ? ok(entry.value) : err(entry.error)
}
```

- [x] **Paso 7: Puertos**

`api/src/modules/accounting/domain/category-repository.port.ts` y `movement-repository.port.ts` declaran `CategoryRepository` (`findAll`, `findById`, `save`, `delete`) y `MovementRepository` (`findAll` con filtros de tipo, estado, categoría y rango; `findById`; `save`), más sus `Symbol`. Un movimiento **no tiene `delete`** en el puerto: lo que existe es anular, y ofrecer un borrado en la interfaz del repositorio invitaría a usarlo.

- [x] **Paso 8: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/accounting
git commit -m "✨ feat: categorías y movimientos que generan su asiento"
```

**Acceptance criteria:**
- [x] Un gasto debita la cuenta de la categoría y acredita la de pago
- [x] Un ingreso hace lo inverso
- [x] Una categoría sin cuenta produce un movimiento sin asiento, sin error
- [x] Un movimiento anulado no genera asiento
- [x] Un movimiento cuyo tipo no coincide con su categoría es rechazado
- [x] El puerto de movimientos no expone borrado

---

### Tarea 4: Cierre mensual

**Descripción:** Cerrar un mes es bloquearlo. Un período cerrado rechaza todo asiento con fecha adentro. Los meses se cierran en orden, cerrar tiene precondiciones, y cada bloqueo se reporta con su razón en texto para que la pantalla diga qué falta en lugar de solo negarse.

**Alcance:** M · **Dependencias:** Tarea 3

**Files:**
- Create: `api/src/modules/accounting/domain/accounting-period.ts`, `period-closing.ts`, `period-repository.port.ts`
- Test: `api/src/modules/accounting/domain/accounting-period.spec.ts`, `period-closing.spec.ts`

**Interfaces:**
- Produces:
  - `class PeriodKey`: `static of(year: number, month: number): Result<PeriodKey, RangeError>` · `static fromDate(date: Date): PeriodKey` · `static parse(text: string): Result<PeriodKey, RangeError>` — acepta `2026-09` · `readonly year, month` · `toString(): string` · `previous(): PeriodKey` · `next(): PeriodKey` · `compareTo(other): number` · `contains(date: Date): boolean` · `range(): DateRange`
  - `type PeriodStatus = 'OPEN' | 'CLOSED'`
  - `class AccountingPeriod`: `readonly key: PeriodKey`, `readonly status: PeriodStatus`, `readonly closedAt: Date | null` · `isClosed(): boolean` · `close(at: Date): AccountingPeriod` · `reopen(): AccountingPeriod`
  - `interface CloseBlocker { code: string; reason: string }`
  - `interface PeriodSnapshot { key: PeriodKey; status: PeriodStatus; entryCount: number; unpostedMovementCount: number; trialBalanceBalances: boolean; previousClosed: boolean }`
  - `blockersFor(snapshot: PeriodSnapshot): CloseBlocker[]`
  - `const PERIOD_REPOSITORY: unique symbol`, `interface PeriodRepository`

- [x] **Paso 1: Escribir el test del período que falla**

`api/src/modules/accounting/domain/accounting-period.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { AccountingPeriod, PeriodKey } from './accounting-period.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('PeriodKey', () => {
  it('se construye desde una fecha', () => {
    expect(PeriodKey.fromDate(utc('2026-09-16')).toString()).toBe('2026-09')
  })

  it('se parsea desde texto', () => {
    expect(unwrap(PeriodKey.parse('2026-09')).month).toBe(9)
    expect(isErr(PeriodKey.parse('09/2026'))).toBe(true)
    expect(isErr(PeriodKey.parse('2026-13'))).toBe(true)
  })

  it('avanza y retrocede cruzando el año', () => {
    expect(unwrap(PeriodKey.of(2026, 12)).next().toString()).toBe('2027-01')
    expect(unwrap(PeriodKey.of(2026, 1)).previous().toString()).toBe('2025-12')
  })

  it('reconoce si una fecha cae dentro, incluidos los bordes', () => {
    const septiembre = unwrap(PeriodKey.of(2026, 9))
    expect(septiembre.contains(utc('2026-09-01'))).toBe(true)
    expect(septiembre.contains(utc('2026-09-30'))).toBe(true)
    expect(septiembre.contains(utc('2026-10-01'))).toBe(false)
    expect(septiembre.contains(utc('2026-08-31'))).toBe(false)
  })

  it('su rango cubre el mes completo, incluido febrero bisiesto', () => {
    const febrero = unwrap(PeriodKey.of(2028, 2))
    expect(febrero.range().to.toISOString().slice(0, 10)).toBe('2028-02-29')
  })

  it('ordena cronológicamente', () => {
    const agosto = unwrap(PeriodKey.of(2026, 8))
    const septiembre = unwrap(PeriodKey.of(2026, 9))
    expect(agosto.compareTo(septiembre)).toBe(-1)
    expect(septiembre.compareTo(agosto)).toBe(1)
    expect(agosto.compareTo(agosto)).toBe(0)
  })
})

describe('AccountingPeriod', () => {
  it('nace abierto', () => {
    expect(AccountingPeriod.open(unwrap(PeriodKey.of(2026, 9))).isClosed()).toBe(false)
  })

  it('cerrar devuelve uno nuevo, sin mutar el original', () => {
    const abierto = AccountingPeriod.open(unwrap(PeriodKey.of(2026, 8)))
    const cerrado = abierto.close(utc('2026-09-01'))

    expect(cerrado.isClosed()).toBe(true)
    expect(cerrado.closedAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(abierto.isClosed()).toBe(false)
  })

  it('reabrir limpia la marca de cierre', () => {
    const reabierto = AccountingPeriod.open(unwrap(PeriodKey.of(2026, 8)))
      .close(utc('2026-09-01'))
      .reopen()

    expect(reabierto.isClosed()).toBe(false)
    expect(reabierto.closedAt).toBeNull()
  })
})
```

- [x] **Paso 2: Escribir el test de los bloqueos**

`api/src/modules/accounting/domain/period-closing.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { PeriodKey } from './accounting-period.js'
import { blockersFor, type PeriodSnapshot } from './period-closing.js'

const snapshot = (overrides: Partial<PeriodSnapshot> = {}): PeriodSnapshot => ({
  key: unwrap(PeriodKey.of(2026, 9)),
  status: 'OPEN',
  entryCount: 3,
  unpostedMovementCount: 0,
  trialBalanceBalances: true,
  previousClosed: true,
  ...overrides,
})

describe('blockersFor', () => {
  it('sin bloqueos, el mes se puede cerrar', () => {
    expect(blockersFor(snapshot())).toEqual([])
  })

  it('bloquea si el mes anterior sigue abierto, y lo nombra', () => {
    const blockers = blockersFor(snapshot({ previousClosed: false }))

    expect(blockers.map((b) => b.code)).toEqual(['PREVIOUS_PERIOD_OPEN'])
    expect(blockers[0]?.reason).toContain('2026-08')
  })

  it('bloquea si hay movimientos sin asiento, y dice cuántos', () => {
    const blockers = blockersFor(snapshot({ unpostedMovementCount: 4 }))

    expect(blockers.map((b) => b.code)).toEqual(['UNPOSTED_MOVEMENTS'])
    expect(blockers[0]?.reason).toContain('4')
  })

  it('bloquea si la comprobación no cuadra', () => {
    expect(blockersFor(snapshot({ trialBalanceBalances: false })).map((b) => b.code)).toEqual([
      'TRIAL_BALANCE_UNBALANCED',
    ])
  })

  it('bloquea si el período ya está cerrado', () => {
    expect(blockersFor(snapshot({ status: 'CLOSED' })).map((b) => b.code)).toEqual([
      'ALREADY_CLOSED',
    ])
  })

  it('acumula todos los bloqueos, no se detiene en el primero', () => {
    const blockers = blockersFor(
      snapshot({ previousClosed: false, unpostedMovementCount: 2, trialBalanceBalances: false }),
    )

    expect(blockers).toHaveLength(3)
  })

  it('un mes sin asientos se puede cerrar: vacío no es inválido', () => {
    expect(blockersFor(snapshot({ entryCount: 0 }))).toEqual([])
  })
})
```

Que los bloqueos se acumulen en vez de cortar en el primero es lo que permite que la pantalla muestre la lista completa de lo que falta, en lugar de hacer que Emilio descubra los problemas de a uno.

- [x] **Paso 3: Correr y confirmar que fallan**

```bash
cd api && npm test -- accounting-period period-closing
```

- [x] **Paso 4: Implementar el período**

`api/src/modules/accounting/domain/accounting-period.ts`:

```ts
import { DateRange } from '../../../shared/kernel/date-range.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'

export type PeriodStatus = 'OPEN' | 'CLOSED'

const lastDayOf = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

export class PeriodKey {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  static of(year: number, month: number): Result<PeriodKey, RangeError> {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
      return err(new RangeError(`Año fuera de rango: ${year}`))
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return err(new RangeError(`Mes fuera de rango: ${month}`))
    }
    return ok(new PeriodKey(year, month))
  }

  static fromDate(date: Date): PeriodKey {
    return new PeriodKey(date.getUTCFullYear(), date.getUTCMonth() + 1)
  }

  static parse(text: string): Result<PeriodKey, RangeError> {
    const match = /^(\d{4})-(\d{2})$/.exec(text)
    if (!match) return err(new RangeError(`El período debe ser AAAA-MM, se recibió «${text}»`))
    return PeriodKey.of(Number(match[1]), Number(match[2]))
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`
  }

  previous(): PeriodKey {
    return this.month === 1 ? new PeriodKey(this.year - 1, 12) : new PeriodKey(this.year, this.month - 1)
  }

  next(): PeriodKey {
    return this.month === 12 ? new PeriodKey(this.year + 1, 1) : new PeriodKey(this.year, this.month + 1)
  }

  compareTo(other: PeriodKey): number {
    if (this.year !== other.year) return this.year < other.year ? -1 : 1
    if (this.month !== other.month) return this.month < other.month ? -1 : 1
    return 0
  }

  range(): DateRange {
    return unwrap(
      DateRange.create(
        new Date(Date.UTC(this.year, this.month - 1, 1)),
        new Date(Date.UTC(this.year, this.month - 1, lastDayOf(this.year, this.month))),
      ),
    )
  }

  contains(date: Date): boolean {
    return this.range().contains(date)
  }
}

export class AccountingPeriod {
  private constructor(
    readonly key: PeriodKey,
    readonly status: PeriodStatus,
    readonly closedAt: Date | null,
  ) {}

  static open(key: PeriodKey): AccountingPeriod {
    return new AccountingPeriod(key, 'OPEN', null)
  }

  static restore(key: PeriodKey, status: PeriodStatus, closedAt: Date | null): AccountingPeriod {
    return new AccountingPeriod(key, status, closedAt)
  }

  isClosed(): boolean {
    return this.status === 'CLOSED'
  }

  close(at: Date): AccountingPeriod {
    return new AccountingPeriod(this.key, 'CLOSED', at)
  }

  reopen(): AccountingPeriod {
    return new AccountingPeriod(this.key, 'OPEN', null)
  }
}
```

- [x] **Paso 5: Implementar los bloqueos**

`api/src/modules/accounting/domain/period-closing.ts`:

```ts
import type { PeriodKey, PeriodStatus } from './accounting-period.js'

export interface CloseBlocker {
  readonly code: string
  readonly reason: string
}

export interface PeriodSnapshot {
  readonly key: PeriodKey
  readonly status: PeriodStatus
  readonly entryCount: number
  readonly unpostedMovementCount: number
  readonly trialBalanceBalances: boolean
  readonly previousClosed: boolean
}

// Se acumulan todos los bloqueos en vez de cortar en el primero: la pantalla
// muestra la lista completa de lo que falta y Emilio no los descubre de a uno.
export const blockersFor = (snapshot: PeriodSnapshot): CloseBlocker[] => {
  const blockers: CloseBlocker[] = []

  if (snapshot.status === 'CLOSED') {
    blockers.push({ code: 'ALREADY_CLOSED', reason: 'El período ya está cerrado.' })
  }

  if (!snapshot.previousClosed) {
    blockers.push({
      code: 'PREVIOUS_PERIOD_OPEN',
      reason: `Cerrá primero ${snapshot.key.previous().toString()}: los meses se cierran en orden.`,
    })
  }

  if (snapshot.unpostedMovementCount > 0) {
    blockers.push({
      code: 'UNPOSTED_MOVEMENTS',
      reason: `Hay ${snapshot.unpostedMovementCount} movimientos sin asiento. Asignales una categoría con cuenta contable.`,
    })
  }

  if (!snapshot.trialBalanceBalances) {
    blockers.push({
      code: 'TRIAL_BALANCE_UNBALANCED',
      reason: 'La comprobación del período no cuadra.',
    })
  }

  return blockers
}
```

Un mes sin asientos no es un bloqueo: un mes en el que no pasó nada es un mes válido y cerrable.

- [x] **Paso 6: Puerto del repositorio**

`api/src/modules/accounting/domain/period-repository.port.ts`:

```ts
import type { AccountingPeriod, PeriodKey } from './accounting-period.js'

export interface PeriodRepository {
  find(key: PeriodKey): Promise<AccountingPeriod | null>
  findAll(): Promise<AccountingPeriod[]>
  findClosedAfter(key: PeriodKey): Promise<AccountingPeriod[]>
  save(period: AccountingPeriod): Promise<void>
  saveMany(periods: readonly AccountingPeriod[]): Promise<void>
}

export const PERIOD_REPOSITORY = Symbol('PERIOD_REPOSITORY')
```

Un mes sin fila en la base es un mes abierto. No hace falta crear doce filas por año para representar lo que es el estado por omisión.

- [x] **Paso 7: El guardián de período cerrado**

`api/src/modules/accounting/application/period-guard.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common'
import { ConflictError } from '../../../shared/http/api-error.js'
import { PeriodKey } from '../domain/accounting-period.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'

@Injectable()
export class PeriodGuard {
  constructor(@Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository) {}

  // Todo camino que escriba un asiento pasa por acá: alta de movimiento, anulación,
  // asiento manual. Es el único lugar donde vive la regla, para que no se olvide en uno.
  async assertOpen(date: Date): Promise<void> {
    const key = PeriodKey.fromDate(date)
    const period = await this.periods.find(key)
    if (period?.isClosed()) {
      throw new ConflictError(`El período ${key.toString()} está cerrado y no acepta asientos.`)
    }
  }
}
```

El guardián vive en la capa de aplicación, no en el agregado: saber si un período está cerrado requiere ir al repositorio, y el dominio no habla con repositorios.

- [x] **Paso 8: Casos de uso de cierre y reapertura**

Estos tres dependen de la comprobación, que se construye en la Tarea 6, y de los repositorios de la Tarea 5. Se escriben ahí, no acá: el dominio del período y el guardián son lo que esta tarea deja listo.

`ClosePeriodUseCase.execute(key)` arma el `PeriodSnapshot` —contando asientos y movimientos sin asiento del mes, y preguntando a la comprobación si cuadra—, corre `blockersFor` y, si hay bloqueos, lanza `SemanticValidationError` con la lista completa en `details`. Si no, guarda el período cerrado.

`ReopenPeriodUseCase.execute(key)` reabre el mes **y todos los posteriores que estén cerrados**, en una sola transacción. Reabrir agosto dejando septiembre cerrado produciría un libro donde un mes abierto queda debajo de uno cerrado, que es justo el estado que la regla del orden existe para impedir.

`ListPeriodsUseCase.execute()` devuelve, por mes con actividad, su estado, sus conteos y sus bloqueos: es lo que alimenta la columna de qué falta para cerrar.

- [x] **Paso 9: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/accounting
git commit -m "✨ feat: cierre mensual como bloqueo de período, con sus precondiciones"
```

**Acceptance criteria:**
- [x] Cerrar un mes con el anterior abierto está bloqueado, y la razón nombra el mes anterior
- [x] Cerrar con movimientos sin asiento está bloqueado, y la razón dice cuántos
- [x] Los bloqueos se acumulan, no se corta en el primero
- [x] Un mes sin asientos se puede cerrar
- [x] Un asiento con fecha dentro de un mes cerrado es rechazado con 409
- [x] Reabrir un mes reabre también los posteriores cerrados
- [x] El rango de un febrero bisiesto llega al día 29

---

### Tarea 5: Persistencia y semilla del plan de cuentas

**Descripción:** El esquema de las cinco tablas, los cuatro repositorios y la semilla del plan de cuentas. Las agregaciones de los reportes se resuelven en la base, no trayendo asientos a memoria.

**Alcance:** L · **Dependencias:** Tarea 4

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/modules/accounting/infrastructure/prisma-account.repository.ts`, `prisma-journal.repository.ts`, `prisma-category.repository.ts`, `prisma-movement.repository.ts`, `prisma-period.repository.ts`, `accounting.mappers.ts`, `chart-seed.ts`
- Test: `api/src/modules/accounting/infrastructure/prisma-journal.repository.spec.ts`, `prisma-account.repository.spec.ts`

- [x] **Paso 1: Ampliar el esquema**

Agregar a `api/prisma/schema.prisma`:

```prisma
enum AccountClass {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  COST_OF_REVENUE
  OPERATING_EXPENSE
}

enum EntrySide {
  DEBIT
  CREDIT
}

enum CategoryKind {
  EXPENSE
  INCOME
}

enum MovementStatus {
  ACTIVE
  VOIDED
}

enum PeriodStatus {
  OPEN
  CLOSED
}

model Account {
  code         String       @id
  name         String
  accountClass AccountClass
  parentCode   String?
  active       Boolean      @default(true)
  sortOrder    Int          @default(0)
  createdAt    DateTime     @default(now()) @db.Timestamptz(3)

  parent   Account?  @relation("AccountTree", fields: [parentCode], references: [code])
  children Account[] @relation("AccountTree")
  lines    JournalLine[]

  @@index([parentCode])
  @@index([accountClass])
  @@map("accounts")
}

model JournalEntry {
  id               String   @id @default(uuid(7))
  date             DateTime @db.Date
  description      String
  reference        String?
  sourceMovementId String?
  reversesEntryId  String?
  createdAt        DateTime @default(now()) @db.Timestamptz(3)

  lines JournalLine[]

  @@index([date])
  @@index([sourceMovementId])
  @@map("journal_entries")
}

model JournalLine {
  id          String    @id @default(uuid(7))
  entryId     String
  accountCode String
  currency    String    @db.Char(3)
  amountMinor BigInt
  side        EntrySide

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountCode], references: [code])

  @@index([accountCode, currency])
  @@index([entryId])
  @@map("journal_lines")
}

model Category {
  id          String       @id @default(uuid(7))
  name        String
  kind        CategoryKind
  accountCode String?
  sortOrder   Int          @default(0)
  active      Boolean      @default(true)

  @@unique([name, kind])
  @@map("categories")
}

model Movement {
  id                 String         @id @default(uuid(7))
  date               DateTime       @db.Date
  kind               CategoryKind
  categoryId         String
  counterparty       String
  amountMinor        BigInt
  currency           String         @db.Char(3)
  paymentAccountCode String?
  receiptUrl         String?
  status             MovementStatus @default(ACTIVE)
  createdAt          DateTime       @default(now()) @db.Timestamptz(3)

  @@index([date])
  @@index([categoryId])
  @@index([status])
  @@map("movements")
}

model AccountingPeriod {
  period   String       @id
  status   PeriodStatus @default(OPEN)
  closedAt DateTime?    @db.Timestamptz(3)

  @@map("accounting_periods")
}
```

`amountMinor` es `BigInt` por la misma razón de siempre. `date` es `@db.Date`: un asiento tiene fecha, no instante. `JournalLine` no tiene restricción de unicidad sobre la cuenta: un mismo asiento puede tocar la misma cuenta dos veces en monedas distintas, que es justamente el caso de la cuenta puente.

El identificador de `AccountingPeriod` es el texto `AAAA-MM`. Ordena cronológicamente como texto y evita una fila por mes que no aporta nada.

```bash
cd api && npx prisma migrate dev --name add_accounting && npx prisma generate
```

- [x] **Paso 2: Escribir el test de las agregaciones que falla**

`api/src/modules/accounting/infrastructure/prisma-journal.repository.spec.ts` monta Testcontainers igual que los de las rebanadas anteriores, siembra el plan de cuentas y prueba:

```ts
describe('PrismaJournalRepository', () => {
  it('guarda un asiento con sus líneas y lo recupera como agregado', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    const found = await repository.findById('a1')

    expect(found?.lines).toHaveLength(2)
    expect(found?.totalFor('CRC', 'DEBIT').minorUnits).toBe(20_000_00n)
  })

  it('agrega totales por cuenta en la base, acotado a una moneda', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoDeGasto('a2', utc('2026-09-17'), 5_000_00n))

    const totals = await repository.totalsByAccount('CRC', septiembre)
    const gasto = totals.find((t) => t.accountCode === '6310')

    expect(gasto?.debits).toBe(25_000_00n)
    expect(gasto?.credits).toBe(0n)
  })

  it('no mezcla monedas en la agregación', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoEnDolares('a2', utc('2026-09-16'), 100_00n))

    const crc = await repository.totalsByAccount('CRC', septiembre)
    const usd = await repository.totalsByAccount('USD', septiembre)

    expect(crc.find((t) => t.accountCode === '6310')?.debits).toBe(20_000_00n)
    expect(usd.find((t) => t.accountCode === '6310')?.debits).toBe(100_00n)
  })

  it('el rango del período excluye lo anterior y lo posterior', async () => {
    await repository.save(asientoDeGasto('a0', utc('2026-08-31'), 1_000_00n))
    await repository.save(asientoDeGasto('a1', utc('2026-09-01'), 2_000_00n))
    await repository.save(asientoDeGasto('a2', utc('2026-09-30'), 3_000_00n))
    await repository.save(asientoDeGasto('a3', utc('2026-10-01'), 4_000_00n))

    const totals = await repository.totalsByAccount('CRC', septiembre)

    expect(totals.find((t) => t.accountCode === '6310')?.debits).toBe(5_000_00n)
  })

  it('el saldo inicial acumula todo lo anterior a la fecha', async () => {
    await repository.save(asientoDeGasto('a0', utc('2026-08-31'), 1_000_00n))
    await repository.save(asientoDeGasto('a1', utc('2026-09-15'), 2_000_00n))

    const opening = await repository.openingBalanceFor('6310', 'CRC', utc('2026-09-01'))

    expect(opening.debits).toBe(1_000_00n)
  })

  it('una cuenta que tocó dos monedas en el mismo asiento se agrega por separado', async () => {
    await repository.save(asientoDeConversion('a1', utc('2026-09-16')))

    const crc = await repository.totalsByAccount('CRC', septiembre)
    const usd = await repository.totalsByAccount('USD', septiembre)

    expect(crc.find((t) => t.accountCode === '1190')?.debits).toBeGreaterThan(0n)
    expect(usd.find((t) => t.accountCode === '1190')?.credits).toBeGreaterThan(0n)
  })
})
```

El último caso es el de la cuenta puente: la misma cuenta, el mismo asiento, dos monedas, un débito de un lado y un crédito del otro. Si la agregación no separa por moneda, ese test se cae.

- [x] **Paso 3: Correr y confirmar que falla**

```bash
cd api && npm test -- prisma-journal
```

- [x] **Paso 4: Implementar los repositorios**

`PrismaJournalRepository` guarda el asiento y sus líneas en una transacción. Las agregaciones usan `groupBy` de Prisma sobre `journal_lines`, filtrando por moneda y por el rango de fechas del asiento, agrupando por `accountCode` y `side`, y sumando `amountMinor`. El resultado se pliega a `{ accountCode, debits, credits }`.

Ninguna agregación trae asientos a memoria. `ledgerFor` sí trae los asientos del rango, pero acotado a una cuenta y una moneda, que es lo que el mayor muestra.

Los otros cuatro repositorios son directos. `PrismaAccountRepository.loadChart()` trae todas las cuentas y construye el `ChartOfAccounts`, que valida la coherencia del árbol al construirse: si la base tuviera un plan incoherente, se detecta al cargarlo y no al asentar.

- [x] **Paso 5: Semilla del plan de cuentas**

`api/src/modules/accounting/infrastructure/chart-seed.ts` declara el plan semilla como dato, y un caso de uso lo inserta si la tabla está vacía:

```ts
export const CHART_SEED: readonly AccountProps[] = [
  { code: '1000', name: 'Activos', accountClass: 'ASSET', parentCode: null, active: true, sortOrder: 10 },
  { code: '1100', name: 'Efectivo y equivalentes', accountClass: 'ASSET', parentCode: '1000', active: true, sortOrder: 10 },
  { code: '1101', name: 'Caja colones', accountClass: 'ASSET', parentCode: '1100', active: true, sortOrder: 10 },
  { code: '1102', name: 'Caja dólares', accountClass: 'ASSET', parentCode: '1100', active: true, sortOrder: 20 },
  { code: '1111', name: 'Banco colones', accountClass: 'ASSET', parentCode: '1100', active: true, sortOrder: 30 },
  { code: '1112', name: 'Banco dólares', accountClass: 'ASSET', parentCode: '1100', active: true, sortOrder: 40 },
  { code: '1190', name: 'Traslados entre monedas', accountClass: 'ASSET', parentCode: '1100', active: true, sortOrder: 90 },
  { code: '1200', name: 'Cuentas por cobrar', accountClass: 'ASSET', parentCode: '1000', active: true, sortOrder: 20 },
  { code: '2000', name: 'Pasivos', accountClass: 'LIABILITY', parentCode: null, active: true, sortOrder: 20 },
  { code: '2100', name: 'Cuentas por pagar', accountClass: 'LIABILITY', parentCode: '2000', active: true, sortOrder: 10 },
  { code: '3000', name: 'Patrimonio', accountClass: 'EQUITY', parentCode: null, active: true, sortOrder: 30 },
  { code: '3110', name: 'Aportes', accountClass: 'EQUITY', parentCode: '3000', active: true, sortOrder: 10 },
  { code: '3210', name: 'Resultados acumulados', accountClass: 'EQUITY', parentCode: '3000', active: true, sortOrder: 20 },
  { code: '4000', name: 'Ingresos', accountClass: 'INCOME', parentCode: null, active: true, sortOrder: 40 },
  { code: '4100', name: 'Ingresos', accountClass: 'INCOME', parentCode: '4000', active: true, sortOrder: 10 },
  { code: '5000', name: 'Costo de ingresos', accountClass: 'COST_OF_REVENUE', parentCode: null, active: true, sortOrder: 50 },
  { code: '6000', name: 'Gastos operativos', accountClass: 'OPERATING_EXPENSE', parentCode: null, active: true, sortOrder: 60 },
  { code: '6100', name: 'Gastos generales', accountClass: 'OPERATING_EXPENSE', parentCode: '6000', active: true, sortOrder: 10 },
]
```

La semilla corre una sola vez, al arrancar con la tabla vacía. **No es una migración de datos que se reaplique**: si Emilio borra una cuenta semilla, es porque no la quiere, y volver a meterla en el siguiente arranque sería el sistema discutiendo con su usuario.

La 1190 es la cuenta puente. Su saldo en cada moneda queda distinto de cero solo mientras una conversión esté a medio registrar, y ese es su valor: si un día no está en cero, hay un asiento de conversión incompleto.

- [x] **Paso 6: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: persistencia de contabilidad con agregación en base y plan de cuentas semilla"
```

**Acceptance criteria:**
- [x] Un asiento vuelve de la base como agregado, con sus líneas
- [x] Las agregaciones corren en la base, con `groupBy`, no en memoria
- [x] La agregación separa por moneda, incluida la cuenta tocada dos veces en el mismo asiento
- [x] El rango del período excluye el día anterior y el posterior
- [x] La semilla corre una sola vez y no se reaplica

---

### Tarea 6: Los cuatro reportes

**Descripción:** Mayor, comprobación, estado de situación y estado de resultados. Ninguno se almacena: los cuatro se calculan desde los asientos. El estado de situación cuadra porque el patrimonio incluye el resultado del período como línea derivada.

**Alcance:** L · **Dependencias:** Tarea 5

**Files:**
- Create: `api/src/modules/accounting/domain/reports/general-ledger.ts`, `trial-balance.ts`, `financial-position.ts`, `income-statement.ts`
- Create: `api/src/modules/accounting/application/get-ledger.use-case.ts`, `get-trial-balance.use-case.ts`, `get-financial-position.use-case.ts`, `get-income-statement.use-case.ts`
- Test: un `.spec.ts` por reporte

**Interfaces:**
- Produces:
  - `buildTrialBalance(totals, chart, currency): TrialBalance` con `{ rows, totalDebits, totalCredits, difference, balances }`
  - `buildLedger(opening, entries, accountCode, currency, accountClass): GeneralLedger` con `{ openingBalance, rows: { date, entryId, description, debit, credit, runningBalance }[], closingBalance }`
  - `buildFinancialPosition(totals, chart, currency): FinancialPosition` con `{ assets, liabilities, equity, periodResult, balances }` y el árbol acumulado
  - `buildIncomeStatement(totals, chart, currency): IncomeStatement` con `{ income, costOfRevenue, operatingExpenses, result }`
  - `rollUp(chart, balances): Map<string, Money>` — acumula de las hojas hacia las agrupadoras

- [x] **Paso 1: Escribir el test de la comprobación que falla**

Casos obligatorios, todos con funciones puras sobre totales ya agregados:

```ts
describe('buildTrialBalance', () => {
  it('reproduce las filas de una comprobación con su saldo con signo', () => {
    const balance = buildTrialBalance(
      [
        { accountCode: '1101', debits: 0n, credits: 219_698_00n },
        { accountCode: '2110', debits: 0n, credits: 500_000_00n },
        { accountCode: '4110', debits: 0n, credits: 1_990_00n },
      ],
      chart,
      'CRC',
    )

    expect(balance.rows.map((r) => [r.accountCode, r.balance.minorUnits])).toEqual([
      ['1101', -219_698_00n],
      ['2110', 500_000_00n],
      ['4110', 1_990_00n],
    ])
  })

  it('cuadra cuando débitos y créditos coinciden', () => {
    const balance = buildTrialBalance(
      [
        { accountCode: '6310', debits: 20_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 20_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(balance.balances).toBe(true)
    expect(balance.difference.minorUnits).toBe(0n)
  })

  it('cuando no cuadra, la diferencia queda a la vista con su signo', () => {
    const balance = buildTrialBalance(
      [
        { accountCode: '6310', debits: 20_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 19_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(balance.balances).toBe(false)
    expect(balance.difference.minorUnits).toBe(1_000_00n)
  })

  it('deja fuera las cuentas sin movimiento en el período', () => {
    const balance = buildTrialBalance([{ accountCode: '6310', debits: 1n, credits: 0n }], chart, 'CRC')
    expect(balance.rows.map((r) => r.accountCode)).toEqual(['6310'])
  })

  it('un período sin movimientos cuadra en cero', () => {
    const balance = buildTrialBalance([], chart, 'CRC')
    expect(balance.rows).toEqual([])
    expect(balance.balances).toBe(true)
  })
})
```

Los tres saldos del primer caso salen de las capturas de referencia. Si el signo del saldo normal estuviera invertido en alguna clase, ese test lo dice.

- [x] **Paso 2: Escribir el test del estado de situación**

```ts
describe('buildFinancialPosition', () => {
  it('cuadra: activo igual a pasivo más patrimonio', () => {
    const position = buildFinancialPosition(totalesDeReferencia, chart, 'CRC')

    expect(position.balances).toBe(true)
    expect(position.assets.minorUnits).toBe(
      position.liabilities.minorUnits + position.equity.minorUnits,
    )
  })

  it('el patrimonio incluye el resultado del período como línea derivada', () => {
    // Un gasto de 10.000 pagado de caja: activo -10.000, pasivo 0, resultado -10.000.
    const position = buildFinancialPosition(
      [
        { accountCode: '6310', debits: 10_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 10_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(position.assets.minorUnits).toBe(-10_000_00n)
    expect(position.liabilities.minorUnits).toBe(0n)
    expect(position.periodResult.minorUnits).toBe(-10_000_00n)
    expect(position.equity.minorUnits).toBe(-10_000_00n)
    expect(position.balances).toBe(true)
  })

  it('una cuenta agrupadora acumula el saldo de sus hijas', () => {
    const position = buildFinancialPosition(
      [
        { accountCode: '1101', debits: 5_000_00n, credits: 0n },
        { accountCode: '1102', debits: 3_000_00n, credits: 0n },
        { accountCode: '4100', debits: 0n, credits: 8_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(position.nodeFor('1100')?.balance.minorUnits).toBe(8_000_00n)
    expect(position.nodeFor('1000')?.balance.minorUnits).toBe(8_000_00n)
  })

  it('un libro vacío cuadra en cero', () => {
    const position = buildFinancialPosition([], chart, 'CRC')
    expect(position.balances).toBe(true)
    expect(position.assets.isZero()).toBe(true)
  })
})
```

El segundo caso es el que justifica el diseño entero: sin la línea derivada de resultado del período, un gasto pagado de caja dejaría el activo en −10.000 contra un patrimonio en 0, y la identidad no cuadraría hasta correr asientos de cierre.

- [x] **Paso 3: Correr, implementar y volver a correr**

```bash
cd api && npm test -- trial-balance financial-position general-ledger income-statement
```

Los cuatro constructores son funciones puras que reciben los totales ya agregados y el plan de cuentas. `rollUp` recorre el árbol en profundidad sumando de las hojas hacia arriba; una cuenta agrupadora nunca tiene saldo propio, siempre es la suma de sus descendientes.

`buildFinancialPosition` calcula `periodResult` con el mismo criterio que `buildIncomeStatement` —ingresos menos costo de ingresos menos gastos operativos— y lo suma al patrimonio como una línea adicional del árbol, con un código reservado que no colisiona con el plan.

`buildLedger` arranca del saldo inicial y va acumulando fila por fila. El saldo corrido usa el signo del saldo normal de la cuenta, igual que el resto.

- [x] **Paso 4: Casos de uso**

Cada reporte tiene su caso de uso, que carga el plan, pide las agregaciones al repositorio y llama al constructor puro. El de situación pide `totalsUpTo` (acumulado hasta la fecha); los de comprobación, mayor y resultados piden por rango.

- [x] **Paso 5: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/accounting
git commit -m "✨ feat: mayor, comprobación, estado de situación y estado de resultados"
```

**Acceptance criteria:**
- [x] La comprobación muestra el saldo con el signo del saldo normal
- [x] Cuando no cuadra, la diferencia queda a la vista
- [x] El estado de situación cuadra con el resultado del período en patrimonio
- [x] Las agrupadoras acumulan el saldo de sus hijas
- [x] Un libro vacío cuadra en cero en los cuatro reportes
- [x] Los cuatro constructores son funciones puras, sin E/S

---

### Tarea 7: API de contabilidad

**Descripción:** Exponer el módulo entero con el formato de error único de la rebanada 1, validación Zod en el borde y paginación en toda lista. El guardián de período cerrado se aplica en los tres caminos que escriben asientos, no en uno solo.

**Alcance:** L · **Dependencias:** Tarea 6

**Files:**
- Create: `api/src/modules/accounting/infrastructure/*.controller.ts` (cuentas, categorías, movimientos, asientos, reportes, períodos)
- Create: `api/src/modules/accounting/infrastructure/accounting.schemas.ts`, `accounting.presenters.ts`
- Create: `api/src/modules/accounting/accounting.module.ts`
- Modify: `api/src/app.module.ts`, `api/src/main.ts` (rutas del OpenAPI)
- Test: `api/src/modules/accounting/infrastructure/accounting.e2e.spec.ts`

**Interfaces:**
- Produces, todos bajo `/api/v1`:
  - `GET|POST /accounts`, `GET|PATCH /accounts/:code`, `GET /accounts/tree?currency=&at=`
  - `GET|POST /categories`, `GET|PATCH|DELETE /categories/:id`
  - `GET|POST /movements`, `GET|PATCH /movements/:id`, `POST /movements/:id/void`
  - `GET|POST /journal-entries`, `GET /journal-entries/:id`
  - `GET /reports/ledger`, `/reports/trial-balance`, `/reports/financial-position`, `/reports/income-statement`
  - `GET /periods`, `POST /periods/:period/close`, `POST /periods/:period/reopen`

- [ ] **Paso 1: Escribir el test de punta a punta que falla**

`accounting.e2e.spec.ts`, con Testcontainers y el mismo montaje de las rebanadas anteriores. Los casos que importan:

```ts
describe('flujo completo de contabilidad', () => {
  it('un movimiento de gasto aparece en el mayor de su cuenta', async () => {
    const categoria = await crearCategoria({ name: 'Software', kind: 'EXPENSE', accountCode: '6100' })
    await crearMovimiento({ categoryId: categoria.id, amount: '2000000', paymentAccountCode: '1101' })

    const mayor = await get('/reports/ledger?account=6100&currency=CRC&from=2026-09-01&to=2026-09-30')

    expect(mayor.body.rows).toHaveLength(1)
    expect(mayor.body.rows[0].debit.minorUnits).toBe('2000000')
    expect(mayor.body.closingBalance.minorUnits).toBe('2000000')
  })

  it('la comprobación del período cuadra después de cargar movimientos', async () => {
    await crearMovimientoSimple()
    const comprobacion = await get('/reports/trial-balance?currency=CRC&from=2026-09-01&to=2026-09-30')

    expect(comprobacion.status).toBe(200)
    expect(comprobacion.body.balances).toBe(true)
    expect(comprobacion.body.difference.minorUnits).toBe('0')
  })

  it('anular deja el original y su reversión en el mayor, y el saldo en cero', async () => {
    const movimiento = await crearMovimientoSimple()
    expect((await post(`/movements/${movimiento.id}/void`)).status).toBe(200)

    const mayor = await get('/reports/ledger?account=6100&currency=CRC&from=2026-09-01&to=2026-09-30')

    expect(mayor.body.rows).toHaveLength(2)
    expect(mayor.body.closingBalance.minorUnits).toBe('0')
  })

  it('un movimiento de categoría sin cuenta se guarda y se marca como no contabilizado', async () => {
    const categoria = await crearCategoria({ name: 'Sin mapear', kind: 'EXPENSE', accountCode: null })
    const response = await crearMovimientoRaw({ categoryId: categoria.id })

    expect(response.status).toBe(201)
    expect(response.body.posted).toBe(false)
  })

  it('el estado de situación cuadra', async () => {
    await crearMovimientoSimple()
    const situacion = await get('/reports/financial-position?currency=CRC&at=2026-09-30')

    expect(situacion.body.balances).toBe(true)
  })

  it('cerrar un mes con el anterior abierto responde 422 con la razón', async () => {
    const response = await post('/periods/2026-09/close')

    expect(response.status).toBe(422)
    expect(response.body.error.details.blockers[0].code).toBe('PREVIOUS_PERIOD_OPEN')
    expect(response.body.error.details.blockers[0].reason).toContain('2026-08')
  })

  it('un asiento con fecha en un período cerrado responde 409', async () => {
    await cerrarHasta('2026-08')
    const response = await crearMovimientoRaw({ date: '2026-08-15' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('CONFLICT')
  })

  it('anular un movimiento de un período cerrado también responde 409', async () => {
    const movimiento = await crearMovimientoRaw({ date: '2026-08-15' })
    await cerrarHasta('2026-08')

    expect((await post(`/movements/${movimiento.body.id}/void`)).status).toBe(409)
  })

  it('reabrir un mes reabre también los posteriores cerrados', async () => {
    await cerrarHasta('2026-09')
    await post('/periods/2026-08/reopen')

    const periodos = await get('/periods')
    const septiembre = periodos.body.data.find((p: { period: string }) => p.period === '2026-09')

    expect(septiembre.status).toBe('OPEN')
  })

  it('un asiento manual descuadrado responde 422', async () => {
    const response = await post('/journal-entries', {
      date: '2026-09-16',
      description: 'Descuadrado',
      lines: [
        { accountCode: '6100', amount: { minorUnits: '1000', currency: 'CRC' }, side: 'DEBIT' },
        { accountCode: '1101', amount: { minorUnits: '900', currency: 'CRC' }, side: 'CREDIT' },
      ],
    })

    expect(response.status).toBe(422)
  })

  it('un asiento de conversión entre monedas es aceptado', async () => {
    const response = await post('/journal-entries', {
      date: '2026-09-16',
      description: 'Compra de dólares',
      lines: [
        { accountCode: '1190', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'DEBIT' },
        { accountCode: '1101', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'CREDIT' },
        { accountCode: '1102', amount: { minorUnits: '100000', currency: 'USD' }, side: 'DEBIT' },
        { accountCode: '1190', amount: { minorUnits: '100000', currency: 'USD' }, side: 'CREDIT' },
      ],
    })

    expect(response.status).toBe(201)
  })

  it('no existe forma de borrar un asiento', async () => {
    const entry = await post('/journal-entries', asientoValido)
    expect((await del(`/journal-entries/${entry.body.id}`)).status).toBe(404)
  })
})
```

El último caso verifica una ausencia. Un `DELETE` que no está ruteado responde 404, y eso es el comportamiento correcto: no hay borrado de asientos, y la API no lo insinúa.

- [ ] **Paso 2: Esquemas Zod**

Todos con `title` en su `meta`, como manda la regla 10 de backend. Los montos viajan con el `moneySchema` de la rebanada 1: `{ minorUnits: string, currency }`. Las fechas, `AAAA-MM-DD`. Los períodos, `AAAA-MM`.

El movimiento de respuesta lleva `posted: boolean` y `journalEntryId: string | null`: la interfaz necesita distinguir un movimiento contabilizado de uno que no lo está, y necesita el enlace para poder mostrar su asiento.

- [ ] **Paso 3: Guardián de período en los tres caminos**

`CreateMovementUseCase`, `VoidMovementUseCase` y `CreateJournalEntryUseCase` llaman a `PeriodGuard.assertOpen(fecha)` antes de escribir. Son tres, y el test de punta a punta cubre los tres. Un guardián que solo se aplica en dos de tres caminos no es un guardián.

- [ ] **Paso 4: Orden de rutas**

En el controlador de cuentas, `GET /accounts/tree` va declarado **antes** que `GET /accounts/:code`. Si no, `tree` se resuelve como un código de cuenta y devuelve 404. Es la tercera vez que aparece este patrón en el proyecto — `payoff-plan`, `latest` y ahora `tree` —, así que conviene dejarlo escrito en el módulo: las rutas literales van antes que las paramétricas.

- [ ] **Paso 5: Exportación a CSV**

`GET /reports/trial-balance?format=csv` devuelve `text/csv` con las mismas filas, con `Content-Disposition` de descarga. El CSV se arma del mismo objeto que sirve el JSON, no con una consulta aparte: dos caminos para el mismo reporte terminan divergiendo.

- [ ] **Paso 6: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
npm run start:dev
curl -s localhost:3000/api/v1/accounts/tree?currency=CRC | head -30
git add api
git commit -m "✨ feat: API de contabilidad con reportes, cierre de período y exportación CSV"
```

**Acceptance criteria:**
- [ ] Los tres caminos que escriben asientos respetan el período cerrado
- [ ] Cerrar con bloqueos responde 422 con la lista completa en `details`
- [ ] `/accounts/tree` está declarado antes que `/accounts/:code`
- [ ] Un asiento de conversión multimoneda es aceptado; uno descuadrado, no
- [ ] No hay ruta de borrado de asientos
- [ ] El CSV sale del mismo objeto que el JSON

---

### Tarea 8: Pantallas de contabilidad

**Descripción:** Ocho vistas. Es la rebanada con más superficie de interfaz del proyecto, y la que más cerca está de caer en la plantilla de administración genérica: tablas, filtros y acciones por fila en todas. La regla F9 se aplica acá con especial dureza.

**Alcance:** L · **Dependencias:** Tarea 7, Tarea 10 de la rebanada 1

**Files:**
- Create: `web/src/routes/contabilidad/` — `cuentas.tsx`, `categorias.tsx`, `movimientos.tsx`, `asientos.tsx`, `mayor.tsx`, `comprobacion.tsx`, `situacion.tsx`, `resultados.tsx`, `cierre.tsx`
- Create: `web/src/features/accounting/` — hooks, componentes y `copy.ts`

- [ ] **Paso 1: Copy y diseño antes que componentes**

Regenerar tipos (`npm run api:types`). Cargar las skills de la regla F1. Producir **todo** el texto con `copywriting`, en `web/src/features/accounting/copy.ts`.

El copy de esta rebanada carga con algo que el resto no: tiene que explicar conceptos contables sin sonar a manual. Los subtítulos de las capturas de referencia son un buen punto de partida conceptual —«los movimientos de una cuenta en una moneda, con su saldo corrido»— pero el texto final lo decide la skill, no se copian.

- [ ] **Paso 2: Decidir la composición antes de escribir JSX**

Ocho vistas que son todas tablas es la receta exacta de la plantilla genérica. Antes de codificar, resolver con `impeccable shape`:

- Qué vista es la principal y cómo se ve que lo es. No todas pesan igual: movimientos es donde Emilio vive; el estado de resultados lo mira una vez al mes.
- Cómo se agrupan las ocho en la navegación sin una barra lateral de ocho ítems planos.
- Qué dato de cada vista merece salir de la tabla y tener peso propio. En comprobación, la diferencia; en cierre, qué falta; en situación, si cuadra.
- Dónde el espacio hace la jerarquía en vez del color.

**Criterio de rechazo:** si las ocho vistas se ven iguales salvo por el contenido de la tabla, no está diseñado, está rellenado.

- [ ] **Paso 3: Plan de cuentas**

Árbol expandible con código, nombre, clase, estado y saldo en la moneda elegida. El selector de moneda es de la vista, no de la cuenta. Alta y edición, y activar o desactivar; el código no se edita nunca, y la interfaz no ofrece el campo en edición.

- [ ] **Paso 4: Categorías**

Lista con su cuenta contable mapeada. Una categoría sin cuenta se distingue visualmente y su fila explica la consecuencia: sus movimientos no se van a contabilizar. Es información, no error: nada de rojo.

- [ ] **Paso 5: Movimientos**

La vista principal. Filtros por tipo, estado, categoría y rango. Alta, edición y anulación. Anular pide confirmación y dice qué va a pasar —que se registra la reversión y quedan las dos partidas—, porque es irreversible en el sentido de que deja rastro.

Un movimiento no contabilizado se distingue en la lista y ofrece el camino para resolverlo: mapear la cuenta de su categoría.

Bajo 768 px, la tabla es una lista de filas, no una tabla con desplazamiento.

- [ ] **Paso 6: Asiento manual, mayor y comprobación**

El asiento manual es un formulario de líneas con la suma por moneda visible mientras se escribe, y el botón de guardar deshabilitado hasta que cuadre en todas. Que el descuadre se vea antes de enviar evita el ciclo de enviar, recibir 422 y volver.

El mayor pide cuenta, moneda y rango, y muestra saldo inicial, filas con saldo corrido y saldo final. Con la cuenta sin elegir, un estado vacío que explica qué elegir.

La comprobación muestra la diferencia **siempre**, cuadre o no. Un indicador que solo aparece cuando algo está mal enseña a no mirarlo. Cada fila enlaza a su mayor. Exportar a CSV.

- [ ] **Paso 7: Estados y cierre**

Situación: árbol de activo, pasivo y patrimonio, con la línea de resultado del período identificada como derivada, no como una cuenta más. La identidad se muestra resuelta con sus tres números, como en la referencia.

Resultados: ingresos, costo de ingresos, gastos operativos y el resultado, por rango.

Cierre: una fila por mes con estado, conteos, si la comprobación cuadra y **qué falta para cerrar**. Los bloqueos se muestran todos, no solo el primero. Cerrar y reabrir desde la fila. Reabrir avisa cuántos meses posteriores va a reabrir antes de hacerlo.

- [ ] **Paso 8: Puerta de calidad**

Aplicar el Paso 9 de la Tarea 11 de la rebanada 1, con las nueve rutas de contabilidad: capturas a 360, 768 y 1440 px en los dos temas, más los estados vacíos, con un elemento y con muchos. `impeccable critique`, `audit`, y cierre con `polish`.

- [ ] **Paso 9: Verificar**

```bash
cd web && npm test && npm run typecheck && npm run build
```

- [ ] Cargar un gasto y verlo aparecer en el mayor de su cuenta
- [ ] Anularlo y ver las dos partidas, con saldo en cero
- [ ] Cargar una conversión entre monedas y ver la cuenta puente volver a cero
- [ ] Intentar cerrar septiembre con agosto abierto y leer la razón en pantalla
- [ ] Cerrar agosto y comprobar que un movimiento con fecha de agosto es rechazado con un toast
- [ ] Ninguna pantalla con desplazamiento horizontal a 360 px
- [ ] Las ocho vistas no se ven iguales

- [ ] **Paso 10: Commit**

```bash
git add web
git commit -m "✨ feat: pantallas de contabilidad, reportes y cierre mensual"
```

**Acceptance criteria:**
- [ ] Todo el copy salió de `copywriting` y vive en `copy.ts`
- [ ] El asiento manual muestra la suma por moneda antes de enviar
- [ ] La comprobación muestra la diferencia siempre, cuadre o no
- [ ] El cierre muestra todos los bloqueos, no solo el primero
- [ ] Reabrir avisa cuántos meses posteriores arrastra
- [ ] Las ocho vistas tienen composición propia y no son ocho tablas iguales
- [ ] Capturas revisadas en los dos temas y los tres anchos

---

### Checkpoint: rebanada 3 completa

- [ ] `cd api && npm test` y `cd web && npm test` en verde
- [ ] Un gasto cargado como movimiento llega hasta el estado de situación
- [ ] Una conversión entre monedas deja la cuenta puente en cero
- [ ] La identidad contable cuadra con datos reales cargados
- [ ] Un mes cerrado rechaza asientos, y reabrirlo arrastra los posteriores
- [ ] Revisión con Emilio antes de la rebanada 4

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La invariante se implementa sobre el total y no por moneda | Alto | Test explícito del asiento que cuadra en total pero no por moneda, en la Tarea 2 |
| El signo del saldo normal se invierte en alguna clase | Alto | Test de las seis clases contra los números de las capturas de referencia |
| Los reportes agregan en memoria y no escalan | Medio | El puerto expone agregaciones, y los tests verifican que existen; `ledgerFor` es el único que trae asientos y va acotado a cuenta y moneda |
| El guardián de período se aplica en dos de tres caminos | Medio | Los tres caminos tienen su caso en el test de punta a punta |
| Las ocho vistas caen en la plantilla genérica | Alto | Paso 2 de la Tarea 8 con `impeccable shape` antes de escribir JSX, y criterio de rechazo explícito |
| El estado de situación no cuadra sin asientos de cierre | Alto | Resuelto por diseño con el resultado del período derivado, con test dedicado |

## Preguntas abiertas

- Ninguna bloqueante. El plan de cuentas semilla es un punto de partida editable; si Emilio prefiere otro, se cambia el dato sin tocar código.
