# Fase 1 · Rebanada 4 — Presupuesto, metas, inversiones y proyección · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la fase 1: evaluar el mes contra un modelo de presupuesto, proyectar si una meta llega a su fecha, saber cuánto rinde una inversión y cuándo vuelve su capital, y ver mes a mes cuándo se libera cada cuota.

**Architecture:** Tres módulos de dominio nuevos —`budget`, `goals`, `investments`— y uno de orquestación, `projection`, que no persiste nada y coordina a los otros a través de sus puertos. `budget` consume una interfaz `CategorizedSpending` que en fase 1 resuelve un proveedor de estimados y en fase 2 uno que agrega transacciones: ese es el punto donde la fase 2 entra sin romper nada.

**Tech Stack:** El mismo de las rebanadas anteriores.

**Spec:** `docs/superpowers/specs/2026-09-20-finanzas-personales-design.md`, secciones 5 y 9

**Requiere:** las rebanadas 1, 2 y 3 completas. El gasto por categoría de esta rebanada sale de los asientos que produce la rebanada 3, no de estimados declarados.

---

## Global Constraints

Valen todas las restricciones de la rebanada 1: versiones pineadas, reglas de backend 1–11 y reglas de frontend F1–F12. Sin paquetes nuevos, con una excepción autorizada el 2026-09-21: `@nestjs/event-emitter`, para el evento `GoalReached` de la Tarea 3. La alternativa sin dependencia era el `EventEmitter` de Node envuelto en un provider; Emilio prefirió el paquete de Nest.

### Decisiones de diseño que este plan fija

1. **El gasto por categoría sale de la contabilidad.** `CategorizedSpending` lo resuelve un proveedor que agrega los asientos del período por cuenta, usando el mapeo categoría → cuenta contable de la rebanada 3. No hay estimados declarados de gasto: el único estimado de la fase 1 es el ingreso mensual proyectado.
2. **Los porcentajes son datos, no código.** 50/30/20 y 70/20/10 son instancias de `PercentageBudgetModel`, no subclases. Una clase por modelo de presupuesto sería el caso de libro de herencia mal usada: lo único que cambia entre ellos son dos números.
3. **La cuota de una deuda va a la cubeta que la deuda declare** (`Debt.budgetBucket`). Los abonos extraordinarios van siempre a la cubeta de ahorro, sin importar la cubeta de la deuda, porque construyen patrimonio en lugar de sostener el mes.
4. **Un préstamo otorgado no consume presupuesto**: su cuota entra como ingreso en la proyección.
5. **Una inversión capitaliza, no amortiza.** No tiene tabla de cuotas. Lo que aporta a la proyección es el mes en que vence y devuelve el capital.
6. **`projection` no tiene repositorio propio.** Orquesta los puertos de los otros módulos y devuelve un resultado calculado. Si algún día necesita persistir, es que dejó de ser una proyección.

### Reparto exacto

Toda asignación de dinero entre cubetas usa `Money.allocate`, nunca `monto × porcentaje` cubeta por cubeta. Con tres cubetas sobre un ingreso no divisible, redondear cada parte por separado pierde o inventa céntimos; `allocate` reparte el residuo y la suma de las partes siempre iguala el total. Está probado desde la rebanada 1 y acá se usa, no se reimplementa.

### Mapa de archivos

```
api/src/modules/
├── budget/
│   ├── domain/         budget-bucket, budget-model, percentage-budget-model,
│   │                   categorized-spending, budget-evaluation, puertos
│   ├── application/    casos de uso
│   └── infrastructure/ repositorio, proveedor de estimados, controlador, esquemas
├── goals/
│   ├── domain/         goal, contribution, puerto
│   ├── application/
│   └── infrastructure/
├── investments/
│   ├── domain/         investment, compounding, puerto
│   ├── application/
│   └── infrastructure/
└── projection/
    ├── application/    cash-flow-projection.use-case
    └── infrastructure/ projections.controller
web/src/
├── routes/             presupuesto, metas, inversiones, proyeccion
└── features/           budget/, goals/, investments/, projection/
```

---

## Tareas

### Tarea 1: Dominio de presupuesto

**Descripción:** El modelo de presupuesto y su evaluación. Las cubetas y sus porcentajes son datos: 50/30/20 es una instancia semilla, no una clase. La evaluación reporta por cubeta cuánto se asignó, cuánto se consumió y la desviación.

**Alcance:** M · **Dependencias:** kernel de la rebanada 1

**Files:**
- Create: `api/src/modules/budget/domain/budget-bucket.ts`, `categorized-spending.ts`, `budget-evaluation.ts`, `budget-model.ts`, `percentage-budget-model.ts`, `budget-model-repository.port.ts`
- Test: `api/src/modules/budget/domain/percentage-budget-model.spec.ts`

**Interfaces:**
- Consumes: `Money`, `Percentage`, `Result` del kernel
- Produces:
  - `interface BudgetBucket { id: string; name: string; percentage: Percentage; isSavings: boolean }`
  - `interface CategorizedSpending { amountFor(bucketId: string): Money }`
  - `interface BucketEvaluation { bucketId; name; allocated: Money; consumed: Money; deviation: Money; status: 'UNDER' | 'ON_TRACK' | 'OVER' }`
  - `interface BudgetEvaluation { income: Money; buckets: BucketEvaluation[]; totalConsumed: Money; surplus: Money }`
  - `interface BudgetModel { readonly id: string; readonly name: string; readonly buckets: readonly BudgetBucket[]; evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation }`
  - `class PercentageBudgetModel implements BudgetModel` — `static create(props): Result<PercentageBudgetModel, RangeError>`
  - `const FIFTY_THIRTY_TWENTY: BudgetModelProps` y `const SEVENTY_TWENTY_TEN: BudgetModelProps` como semillas
  - `const BUDGET_MODEL_REPOSITORY: unique symbol` e `interface BudgetModelRepository`

- [x] **Paso 1: Escribir el test que falla**

`api/src/modules/budget/domain/percentage-budget-model.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import type { CategorizedSpending } from './categorized-spending.js'
import { FIFTY_THIRTY_TWENTY, PercentageBudgetModel } from './percentage-budget-model.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const pct = (value: number) => unwrap(Percentage.create(value))

const spending = (amounts: Record<string, bigint>): CategorizedSpending => ({
  amountFor: (bucketId) => crc(amounts[bucketId] ?? 0n),
})

const modelo = () => unwrap(PercentageBudgetModel.create(FIFTY_THIRTY_TWENTY))

describe('PercentageBudgetModel', () => {
  it('reparte el ingreso según los porcentajes', () => {
    const evaluation = modelo().evaluate(crc(100_000_00n), spending({}))

    expect(evaluation.buckets.map((b) => [b.bucketId, b.allocated.minorUnits])).toEqual([
      ['necesidades', 50_000_00n],
      ['deseos', 30_000_00n],
      ['ahorro', 20_000_00n],
    ])
  })

  it('el reparto cuadra exactamente en un ingreso no divisible', () => {
    const evaluation = modelo().evaluate(crc(1_000_001n), spending({}))
    const total = evaluation.buckets.reduce((acc, b) => acc + b.allocated.minorUnits, 0n)

    expect(total).toBe(1_000_001n)
  })

  it('reporta la desviación por cubeta y su estado', () => {
    const evaluation = modelo().evaluate(
      crc(100_000_00n),
      spending({ necesidades: 55_000_00n, deseos: 20_000_00n, ahorro: 20_000_00n }),
    )

    const necesidades = evaluation.buckets[0]
    expect(necesidades?.consumed.minorUnits).toBe(55_000_00n)
    expect(necesidades?.deviation.minorUnits).toBe(-5_000_00n)
    expect(necesidades?.status).toBe('OVER')

    expect(evaluation.buckets[1]?.status).toBe('UNDER')
    expect(evaluation.buckets[2]?.status).toBe('ON_TRACK')
  })

  it('reporta el excedente del mes', () => {
    const evaluation = modelo().evaluate(
      crc(100_000_00n),
      spending({ necesidades: 40_000_00n, deseos: 20_000_00n, ahorro: 20_000_00n }),
    )

    expect(evaluation.totalConsumed.minorUnits).toBe(80_000_00n)
    expect(evaluation.surplus.minorUnits).toBe(20_000_00n)
  })

  it('rechaza un modelo cuyos porcentajes no suman 100', () => {
    const result = PercentageBudgetModel.create({
      id: 'roto',
      name: 'No suma',
      buckets: [
        { id: 'a', name: 'A', percentage: pct(50), isSavings: false },
        { id: 'b', name: 'B', percentage: pct(30), isSavings: false },
      ],
    })

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un modelo sin cubetas o con identificadores repetidos', () => {
    expect(isErr(PercentageBudgetModel.create({ id: 'v', name: 'Vacío', buckets: [] }))).toBe(true)
    expect(
      isErr(
        PercentageBudgetModel.create({
          id: 'd',
          name: 'Duplicado',
          buckets: [
            { id: 'a', name: 'A', percentage: pct(50), isSavings: false },
            { id: 'a', name: 'A otra vez', percentage: pct(50), isSavings: false },
          ],
        }),
      ),
    ).toBe(true)
  })

  it('acepta cualquier reparto propio que sume 100, no solo los conocidos', () => {
    const result = PercentageBudgetModel.create({
      id: 'propio',
      name: 'A mi manera',
      buckets: [
        { id: 'fijos', name: 'Fijos', percentage: pct(65), isSavings: false },
        { id: 'gustos', name: 'Gustos', percentage: pct(15), isSavings: false },
        { id: 'patrimonio', name: 'Patrimonio', percentage: pct(20), isSavings: true },
      ],
    })

    expect(isErr(result)).toBe(false)
  })

  it('exige exactamente una cubeta de ahorro, que es donde caen los abonos extraordinarios', () => {
    expect(
      isErr(
        PercentageBudgetModel.create({
          id: 'sin-ahorro',
          name: 'Sin ahorro',
          buckets: [
            { id: 'a', name: 'A', percentage: pct(50), isSavings: false },
            { id: 'b', name: 'B', percentage: pct(50), isSavings: false },
          ],
        }),
      ),
    ).toBe(true)
  })
})
```

- [x] **Paso 2: Correr y confirmar que falla**

```bash
cd api && npm test -- percentage-budget-model
```

- [x] **Paso 3: Implementar los tipos de apoyo**

`api/src/modules/budget/domain/budget-bucket.ts`:

```ts
import type { Percentage } from '../../../shared/kernel/percentage.js'

export interface BudgetBucket {
  readonly id: string
  readonly name: string
  readonly percentage: Percentage
  // Los abonos extraordinarios a deudas caen siempre acá, sea cual sea la cubeta de la deuda.
  readonly isSavings: boolean
}
```

`api/src/modules/budget/domain/categorized-spending.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'

// Lo resuelve un proveedor que agrega los asientos del período por cuenta contable, a través
// del mapeo categoría → cuenta de la rebanada 3. La interfaz existe para poder cambiar la
// fuente del gasto sin tocar el dominio de presupuesto.
export interface CategorizedSpending {
  amountFor(bucketId: string): Money
}
```

`api/src/modules/budget/domain/budget-evaluation.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'

export type BucketStatus = 'UNDER' | 'ON_TRACK' | 'OVER'

export interface BucketEvaluation {
  readonly bucketId: string
  readonly name: string
  readonly allocated: Money
  readonly consumed: Money
  // Positiva si sobró en la cubeta, negativa si se pasó.
  readonly deviation: Money
  readonly status: BucketStatus
}

export interface BudgetEvaluation {
  readonly income: Money
  readonly buckets: readonly BucketEvaluation[]
  readonly totalConsumed: Money
  readonly surplus: Money
}
```

`api/src/modules/budget/domain/budget-model.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'
import type { BudgetBucket } from './budget-bucket.js'
import type { BudgetEvaluation } from './budget-evaluation.js'
import type { CategorizedSpending } from './categorized-spending.js'

export interface BudgetModel {
  readonly id: string
  readonly name: string
  readonly buckets: readonly BudgetBucket[]
  evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation
}
```

- [x] **Paso 4: Implementar el modelo por porcentajes**

`api/src/modules/budget/domain/percentage-budget-model.ts`:

```ts
import { Decimal } from 'decimal.js'
import type { Money } from '../../../shared/kernel/money.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import type { BudgetBucket } from './budget-bucket.js'
import type { BucketStatus, BudgetEvaluation } from './budget-evaluation.js'
import type { BudgetModel } from './budget-model.js'
import type { CategorizedSpending } from './categorized-spending.js'

export interface BudgetModelProps {
  readonly id: string
  readonly name: string
  readonly buckets: readonly BudgetBucket[]
}

export class PercentageBudgetModel implements BudgetModel {
  private constructor(private readonly props: BudgetModelProps) {}

  static create(props: BudgetModelProps): Result<PercentageBudgetModel, RangeError> {
    if (props.buckets.length === 0) {
      return err(new RangeError('Un modelo de presupuesto necesita al menos una cubeta'))
    }

    const ids = new Set(props.buckets.map((bucket) => bucket.id))
    if (ids.size !== props.buckets.length) {
      return err(new RangeError('Las cubetas de un modelo no pueden repetir identificador'))
    }

    const total = props.buckets.reduce(
      (acc, bucket) => acc.plus(bucket.percentage.value),
      new Decimal(0),
    )
    if (!total.equals(100)) {
      return err(
        new RangeError(`Los porcentajes de un modelo deben sumar 100, suman ${total.toString()}`),
      )
    }

    if (props.buckets.filter((bucket) => bucket.isSavings).length !== 1) {
      return err(
        new RangeError('Un modelo necesita exactamente una cubeta de ahorro, donde caen los abonos extraordinarios'),
      )
    }

    return ok(new PercentageBudgetModel(props))
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get buckets(): readonly BudgetBucket[] { return this.props.buckets }

  evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation {
    // allocate reparte el residuo: la suma de lo asignado siempre iguala el ingreso.
    const allocations = income.allocate(
      this.props.buckets.map((bucket) => bucket.percentage.value.toNumber()),
    )

    const buckets = this.props.buckets.map((bucket, index) => {
      const allocated = allocations[index] ?? income.multiply(0)
      const consumed = spending.amountFor(bucket.id)
      const deviation = unwrap(allocated.subtract(consumed))
      return {
        bucketId: bucket.id,
        name: bucket.name,
        allocated,
        consumed,
        deviation,
        status: statusOf(deviation, allocated),
      }
    })

    const totalConsumed = buckets.reduce(
      (acc, bucket) => unwrap(acc.add(bucket.consumed)),
      income.multiply(0),
    )

    return {
      income,
      buckets,
      totalConsumed,
      surplus: unwrap(income.subtract(totalConsumed)),
    }
  }
}

// Una desviación de hasta el 2 % de lo asignado se considera en línea: el presupuesto
// es una guía, no un cronómetro, y marcar en rojo una diferencia de un colón es ruido.
const ON_TRACK_TOLERANCE = 0.02

const statusOf = (deviation: Money, allocated: Money): BucketStatus => {
  const tolerance = allocated.multiply(ON_TRACK_TOLERANCE)
  const magnitude = deviation.isNegative() ? deviation.negate() : deviation
  if (unwrap(magnitude.compareTo(tolerance)) <= 0) return 'ON_TRACK'
  return deviation.isNegative() ? 'OVER' : 'UNDER'
}

const bucket = (id: string, name: string, percentage: number, isSavings = false): BudgetBucket => ({
  id,
  name,
  percentage: unwrap(Percentage.create(percentage)),
  isSavings,
})

export const FIFTY_THIRTY_TWENTY: BudgetModelProps = {
  id: '50-30-20',
  name: '50/30/20',
  buckets: [
    bucket('necesidades', 'Necesidades', 50),
    bucket('deseos', 'Deseos', 30),
    bucket('ahorro', 'Ahorro', 20, true),
  ],
}

export const SEVENTY_TWENTY_TEN: BudgetModelProps = {
  id: '70-20-10',
  name: '70/20/10',
  buckets: [
    bucket('gastos', 'Gastos', 70),
    bucket('ahorro', 'Ahorro', 20, true),
    bucket('deuda', 'Deuda', 10),
  ],
}
```

Las dos constantes son datos. Agregar un modelo nuevo es agregar un objeto, no una clase.

- [x] **Paso 5: Puerto del repositorio**

`api/src/modules/budget/domain/budget-model-repository.port.ts`:

```ts
import type { BudgetModel } from './budget-model.js'

export interface BudgetModelRepository {
  findAll(): Promise<BudgetModel[]>
  findById(id: string): Promise<BudgetModel | null>
  findActive(): Promise<BudgetModel | null>
  save(model: BudgetModel, active: boolean): Promise<void>
}

export const BUDGET_MODEL_REPOSITORY = Symbol('BUDGET_MODEL_REPOSITORY')
```

- [x] **Paso 6: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/budget
git commit -m "✨ feat: modelo de presupuesto por porcentajes con evaluación por cubeta"
```

**Acceptance criteria:**
- [x] Un modelo cuyos porcentajes no suman 100 es rechazado
- [x] El reparto cuadra al céntimo sobre un ingreso no divisible
- [x] Un reparto propio que suma 100 se acepta sin tocar código
- [x] Un modelo sin cubeta de ahorro es rechazado
- [x] La desviación se reporta con signo y con estado

---

### Tarea 2: Presupuesto contra la contabilidad

**Descripción:** Conectar el modelo de presupuesto con los asientos reales. `CategorizedSpending` lo resuelve un proveedor que agrega el período por cuenta contable y lo pliega a cubetas usando el mapeo de la rebanada 3. Es la costura donde el presupuesto deja de ser teoría.

**Alcance:** M · **Dependencias:** Tarea 1, rebanada 3 completa

**Files:**
- Create: `api/src/modules/budget/infrastructure/accounting-spending.provider.ts`, `prisma-budget-model.repository.ts`, `budget.schemas.ts`, `budget.controller.ts`, `budget-models.controller.ts`
- Create: `api/src/modules/budget/application/evaluate-month.use-case.ts`, `list-budget-models.use-case.ts`, `save-budget-model.use-case.ts`
- Create: `api/src/modules/budget/budget.module.ts`
- Modify: `api/prisma/schema.prisma`, `api/src/app.module.ts`
- Test: `api/src/modules/budget/infrastructure/accounting-spending.provider.spec.ts`, `budget.controller.spec.ts`

**Interfaces:**
- Consumes: `BudgetModel`, `CategorizedSpending`, `PeriodKey`, `JournalRepository`, `ChartOfAccounts`
- Produces:
  - `interface BucketAccountMapping { bucketId: string; accountCodes: string[] }`
  - `class AccountingSpendingProvider`: `spendingFor(period: PeriodKey, currency: CurrencyCode, mapping: readonly BucketAccountMapping[]): Promise<CategorizedSpending>`
  - `EvaluateMonthUseCase.execute(period: string, currency: CurrencyCode): Promise<BudgetEvaluation>`
  - `GET /api/v1/budget/evaluation?month=YYYY-MM&currency=CRC`
  - `GET|POST /api/v1/budget-models`, `GET|PATCH /api/v1/budget-models/:id`

- [x] **Paso 1: Ampliar el esquema**

```prisma
model BudgetModel {
  id        String         @id @default(uuid(7))
  name      String
  active    Boolean        @default(false)
  createdAt DateTime       @default(now()) @db.Timestamptz(3)
  buckets   BudgetBucket[]

  @@map("budget_models")
}

model BudgetBucket {
  id           String  @id @default(uuid(7))
  modelId      String
  bucketKey    String
  name         String
  percentage   Decimal @db.Decimal(6, 3)
  isSavings    Boolean @default(false)
  sortOrder    Int     @default(0)
  accountCodes String[]

  model BudgetModel @relation(fields: [modelId], references: [id], onDelete: Cascade)

  @@unique([modelId, bucketKey])
  @@map("budget_buckets")
}

model BudgetIncome {
  period      String   @id
  amountMinor BigInt
  currency    String   @db.Char(3)

  @@map("budget_income")
}
```

`accountCodes` es la lista de cuentas de gasto que alimentan la cubeta. Es un arreglo en la fila de la cubeta y no una tabla aparte porque no tiene atributos propios: es la relación desnuda, y normalizarla solo agregaría un join.

`percentage` es `Decimal(6,3)`, no `Float`, igual que toda tasa del proyecto.

`BudgetIncome` guarda el ingreso estimado del mes. Es el único estimado declarado que queda en la fase 1; el gasto sale de los asientos.

```bash
cd api && npx prisma migrate dev --name add_budget && npx prisma generate
```

- [x] **Paso 2: Escribir el test del proveedor que falla**

`accounting-spending.provider.spec.ts`:

```ts
describe('AccountingSpendingProvider', () => {
  const mapping = [
    { bucketId: 'necesidades', accountCodes: ['6100', '6110'] },
    { bucketId: 'deseos', accountCodes: ['6200'] },
    { bucketId: 'ahorro', accountCodes: [] },
  ]

  it('suma los asientos de las cuentas de cada cubeta', async () => {
    journal.totalsByAccount.mockResolvedValue([
      { accountCode: '6100', debits: 30_000_00n, credits: 0n },
      { accountCode: '6110', debits: 20_000_00n, credits: 0n },
      { accountCode: '6200', debits: 15_000_00n, credits: 0n },
    ])

    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('necesidades').minorUnits).toBe(50_000_00n)
    expect(spending.amountFor('deseos').minorUnits).toBe(15_000_00n)
  })

  it('una cubeta sin cuentas mapeadas consume cero, no falla', async () => {
    journal.totalsByAccount.mockResolvedValue([])
    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('ahorro').minorUnits).toBe(0n)
  })

  it('una cubeta desconocida devuelve cero', async () => {
    journal.totalsByAccount.mockResolvedValue([])
    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('inventada').minorUnits).toBe(0n)
  })

  it('un reintegro resta del gasto de la cubeta', async () => {
    // Una devolución acredita la cuenta de gasto: el consumo neto del mes baja.
    journal.totalsByAccount.mockResolvedValue([
      { accountCode: '6100', debits: 30_000_00n, credits: 5_000_00n },
    ])

    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('necesidades').minorUnits).toBe(25_000_00n)
  })

  it('pide a la contabilidad solo el rango del período', async () => {
    await provider.spendingFor(septiembre, 'CRC', mapping)

    const [currency, range] = journal.totalsByAccount.mock.calls[0]
    expect(currency).toBe('CRC')
    expect(range.from.toISOString().slice(0, 10)).toBe('2026-09-01')
    expect(range.to.toISOString().slice(0, 10)).toBe('2026-09-30')
  })

  it('ignora las cuentas que no pertenecen a ninguna cubeta', async () => {
    journal.totalsByAccount.mockResolvedValue([
      { accountCode: '6100', debits: 30_000_00n, credits: 0n },
      { accountCode: '1101', debits: 0n, credits: 30_000_00n },
    ])

    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('necesidades').minorUnits).toBe(30_000_00n)
  })
```

El caso del reintegro importa: el consumo de una cubeta es el saldo neto de sus cuentas de gasto, débitos menos créditos, no la suma de débitos. Una devolución tiene que bajar el consumo del mes.

El último caso también: la contraparte de todo gasto es una cuenta de activo, y si el proveedor sumara todo lo que viene, contaría el gasto dos veces.

- [x] **Paso 3: Implementar el proveedor**

```ts
@Injectable()
export class AccountingSpendingProvider {
  constructor(@Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository) {}

  async spendingFor(
    period: PeriodKey,
    currency: CurrencyCode,
    mapping: readonly BucketAccountMapping[],
  ): Promise<CategorizedSpending> {
    const totals = await this.journal.totalsByAccount(currency, period.range())
    const byAccount = new Map(totals.map((t) => [t.accountCode, t]))

    const byBucket = new Map<string, Money>()
    for (const { bucketId, accountCodes } of mapping) {
      // El consumo es el saldo neto de las cuentas de gasto: un reintegro lo baja.
      const consumed = accountCodes.reduce((acc, code) => {
        const totals = byAccount.get(code)
        if (!totals) return acc
        return acc + totals.debits - totals.credits
      }, 0n)
      byBucket.set(bucketId, Money.fromMinorUnits(consumed, currency))
    }

    return {
      amountFor: (bucketId) => byBucket.get(bucketId) ?? Money.zero(currency),
    }
  }
}
```

- [x] **Paso 4: Caso de uso de evaluación**

`EvaluateMonthUseCase` carga el modelo activo, lee el ingreso estimado del mes, arma el mapeo desde las cubetas del modelo, pide el gasto al proveedor y llama a `evaluate`. Si no hay modelo activo, `SemanticValidationError` con un mensaje que dice qué falta hacer. Si no hay ingreso declarado para el mes, evalúa con ingreso cero y la respuesta lo marca: mostrar un presupuesto sobre un ingreso inventado sería peor que mostrar que falta el dato.

- [x] **Paso 5: API y test de punta a punta**

`GET /budget/evaluation?month=2026-09&currency=CRC` devuelve la evaluación con las cubetas, sus montos y su estado. `GET|POST /budget-models` y `PATCH /budget-models/:id` administran los modelos; activar uno desactiva el resto, en la misma transacción.

Test de punta a punta: cargar el modelo 50/30/20, declarar un ingreso, cargar movimientos de gasto en cuentas mapeadas, y verificar que la evaluación refleja el gasto real. Más el caso de un modelo cuyos porcentajes no suman 100 rechazado con 422.

- [x] **Paso 6: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: evaluación de presupuesto contra los asientos del período"
```

**Acceptance criteria:**
- [x] El consumo de cada cubeta es el neto de sus cuentas, con los reintegros restando
- [x] Una cubeta sin cuentas mapeadas consume cero sin fallar
- [x] Solo se piden los asientos del rango del mes
- [x] Sin modelo activo, 422 con un mensaje que dice qué falta
- [x] Activar un modelo desactiva el resto

---

### Tarea 3: Metas

**Descripción:** Meta con monto objetivo, fecha deseada, aportes y prioridad. Deriva el aporte mensual requerido para llegar a la fecha, y la fecha proyectada real según el ritmo de aporte observado. La diferencia entre esas dos fechas es la respuesta a si se llega o no.

**Alcance:** M · **Dependencias:** kernel de la rebanada 1

**Files:**
- Create: `api/src/modules/goals/domain/goal.ts`, `contribution.ts`, `goal-repository.port.ts`
- Create: `api/src/modules/goals/application/*.use-case.ts`, `api/src/modules/goals/infrastructure/*`
- Modify: `api/prisma/schema.prisma`
- Test: `api/src/modules/goals/domain/goal.spec.ts`, `api/src/modules/goals/infrastructure/goals.controller.spec.ts`

**Interfaces:**
- Produces:
  - `interface Contribution { id: string; date: Date; amount: Money }`
  - `class Goal`: `static create(props): Result<Goal, RangeError>` · `readonly id, name, target: Money, desiredDate, priority, contributions, accountCode: string | null` · `contributed(): Money` · `remaining(): Money` · `progress(): Percentage` · `isReached(): boolean` · `requiredMonthlyContribution(from: Date): Money` · `observedMonthlyPace(from: Date): Money` · `projectedDate(from: Date): Date | null` · `addContribution(c): Result<Goal, RangeError>`

- [x] **Paso 1: Escribir el test que falla**

```ts
const meta = (contributions: Contribution[] = []) =>
  unwrap(
    Goal.create({
      id: 'europa',
      name: 'Europa',
      target: crc(5_000_000_00n),
      desiredDate: utc('2027-09-01'),
      priority: 1,
      accountCode: null,
      contributions,
    }),
  )

describe('Goal', () => {
  it('reporta lo aportado y lo que falta', () => {
    const g = meta([aporte('2026-09-01', 1_000_000_00n), aporte('2026-10-01', 500_000_00n)])

    expect(g.contributed().minorUnits).toBe(1_500_000_00n)
    expect(g.remaining().minorUnits).toBe(3_500_000_00n)
  })

  it('reporta el avance como porcentaje', () => {
    expect(meta([aporte('2026-09-01', 1_250_000_00n)]).progress().value.toNumber()).toBe(25)
  })

  it('deriva el aporte mensual requerido para llegar a la fecha deseada', () => {
    // Faltan 5.000.000 y quedan 12 meses desde septiembre de 2026.
    expect(meta().requiredMonthlyContribution(utc('2026-09-01')).minorUnits).toBe(416_666_67n)
  })

  it('el requerido baja a medida que se aporta', () => {
    const g = meta([aporte('2026-09-01', 2_000_000_00n)])
    expect(g.requiredMonthlyContribution(utc('2026-09-01')).minorUnits).toBe(250_000_00n)
  })

  it('proyecta la fecha real según el ritmo observado', () => {
    // Tres meses aportando 500.000: el ritmo es 500.000 al mes y faltan 3.500.000,
    // o sea siete meses más desde enero de 2027.
    const g = meta([
      aporte('2026-10-01', 500_000_00n),
      aporte('2026-11-01', 500_000_00n),
      aporte('2026-12-01', 500_000_00n),
    ])

    expect(g.projectedDate(utc('2027-01-01'))?.toISOString().slice(0, 7)).toBe('2027-08')
  })

  it('sin aportes no hay fecha proyectada: no se inventa un ritmo', () => {
    expect(meta().projectedDate(utc('2026-09-01'))).toBeNull()
  })

  it('una meta alcanzada lo reporta y no pide más aportes', () => {
    const g = meta([aporte('2026-09-01', 5_000_000_00n)])

    expect(g.isReached()).toBe(true)
    expect(g.remaining().isZero()).toBe(true)
    expect(g.requiredMonthlyContribution(utc('2026-09-01')).isZero()).toBe(true)
  })

  it('una fecha deseada ya pasada exige el saldo completo de una vez', () => {
    expect(meta().requiredMonthlyContribution(utc('2028-01-01')).minorUnits).toBe(5_000_000_00n)
  })

  it('rechaza un objetivo no positivo y un aporte de otra moneda', () => {
    expect(isErr(Goal.create({ ...props, target: crc(0n) }))).toBe(true)
    expect(isErr(meta().addContribution(aporteUsd('2026-09-01', 100n)))).toBe(true)
  })

  it('aportar de más no pasa del objetivo en el avance', () => {
    expect(meta([aporte('2026-09-01', 9_000_000_00n)]).progress().value.toNumber()).toBe(100)
  })
})
```

Que sin aportes no haya fecha proyectada es deliberado: proyectar desde cero exigiría inventar un ritmo, y una fecha inventada es peor que decir que todavía no se sabe.

- [x] **Paso 2: Implementar, correr y persistir**

El esquema agrega `goals` y `goal_contributions`, con montos en `BigInt` y fechas en `@db.Date`. La API expone `GET|POST /goals`, `GET|PATCH|DELETE /goals/:id` y `POST /goals/:id/contributions`.

Al alcanzarse una meta, el caso de uso de aporte emite `GoalReached` con el emisor de eventos de Nest. Sin bus, sin CQRS: un emisor en proceso, como dice el spec.

- [x] **Paso 3: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: metas con aporte requerido y fecha proyectada"
```

**Acceptance criteria:**
- [x] El aporte requerido baja a medida que se aporta
- [x] La fecha proyectada sale del ritmo observado, no del deseado
- [x] Sin aportes no hay fecha proyectada
- [x] Una fecha deseada pasada exige el saldo completo
- [x] Un aporte en otra moneda es rechazado

---

### Tarea 4: Inversiones

**Descripción:** Una inversión capitaliza, no amortiza. No tiene tabla de cuotas: tiene valor proyectado a una fecha, interés ganado y, si es a plazo, el mes en que el capital vuelve a estar disponible. Eso último es lo único que aporta a la proyección de flujo.

**Alcance:** M · **Dependencias:** kernel de la rebanada 1

**Files:**
- Create: `api/src/modules/investments/domain/investment.ts`, `compounding.ts`, `investment-repository.port.ts`
- Create: `api/src/modules/investments/application/*`, `infrastructure/*`
- Modify: `api/prisma/schema.prisma`
- Test: `api/src/modules/investments/domain/investment.spec.ts`

**Interfaces:**
- Produces:
  - `type InvestmentKind = 'FIXED_TERM' | 'OPEN'`
  - `class Investment`: `static create(props): Result<Investment, RangeError>` · `readonly id, name, principal: Money, rate: InterestRate, openedAt, kind, maturesAt: Date | null, accountCode: string | null, contributions` · `valueAt(date: Date): Money` · `interestEarnedAt(date: Date): Money` · `maturityPeriod(): { year: number; month: number } | null` · `isMaturedAt(date: Date): boolean` · `addContribution(c): Result<Investment, RangeError>`
  - `compoundedValue(principal: Money, monthlyRate: Decimal, months: number): Money`

#### Cálculo de referencia hecho a mano

Capital ₡10.000,00 · tasa nominal anual 12 % con capitalización mensual (i = 0,01) · 3 meses.

Valor = P·(1+i)^n = 10.000 × 1,01³ = 10.000 × 1,030301 = **₡10.303,01** (1.030.301 céntimos)
Interés ganado = 1.030.301 − 1.000.000 = **30.301 céntimos**

A 12 meses: 10.000 × 1,01¹² = 10.000 × 1,126825030131969… = ₡11.268,25 (1.126.825 céntimos).

- [x] **Paso 1: Escribir el test que falla**

```ts
const inversion = (overrides = {}) =>
  unwrap(
    Investment.create({
      id: 'plazo',
      name: 'Certificado a plazo',
      principal: crc(1_000_000n),
      rate: unwrap(InterestRate.create(12, 'MONTHLY')),
      openedAt: utc('2026-01-15'),
      kind: 'FIXED_TERM',
      maturesAt: utc('2027-01-15'),
      accountCode: null,
      contributions: [],
      ...overrides,
    }),
  )

describe('Investment', () => {
  it('reproduce el cálculo de interés compuesto hecho a mano', () => {
    expect(inversion().valueAt(utc('2026-04-15')).minorUnits).toBe(1_030_301n)
    expect(inversion().interestEarnedAt(utc('2026-04-15')).minorUnits).toBe(30_301n)
  })

  it('capitaliza doce meses igual que el cálculo a mano', () => {
    expect(inversion().valueAt(utc('2027-01-15')).minorUnits).toBe(1_126_825n)
  })

  it('en la fecha de apertura vale el capital, sin interés', () => {
    expect(inversion().valueAt(utc('2026-01-15')).minorUnits).toBe(1_000_000n)
    expect(inversion().interestEarnedAt(utc('2026-01-15')).isZero()).toBe(true)
  })

  it('antes de la apertura vale el capital y no un valor negativo', () => {
    expect(inversion().valueAt(utc('2025-01-01')).minorUnits).toBe(1_000_000n)
  })

  it('una inversión a plazo deja de capitalizar en su vencimiento', () => {
    const alVencer = inversion().valueAt(utc('2027-01-15')).minorUnits
    expect(inversion().valueAt(utc('2028-01-15')).minorUnits).toBe(alVencer)
  })

  it('una inversión abierta sigue capitalizando indefinidamente', () => {
    const abierta = inversion({ kind: 'OPEN', maturesAt: null })
    expect(abierta.valueAt(utc('2028-01-15')).minorUnits).toBeGreaterThan(
      abierta.valueAt(utc('2027-01-15')).minorUnits,
    )
  })

  it('un aporte capitaliza desde su propia fecha, no desde la apertura', () => {
    const conAporte = inversion({
      contributions: [{ id: 'c1', date: utc('2026-07-15'), amount: crc(1_000_000n) }],
    })

    // El capital original lleva doce meses; el aporte, seis.
    const esperado = 1_126_825n + 1_061_520n
    expect(conAporte.valueAt(utc('2027-01-15')).minorUnits).toBe(esperado)
  })

  it('reporta el mes en que el capital vuelve a estar disponible', () => {
    expect(inversion().maturityPeriod()).toEqual({ year: 2027, month: 1 })
    expect(inversion({ kind: 'OPEN', maturesAt: null }).maturityPeriod()).toBeNull()
  })

  it('una tasa de 0 % mantiene el capital sin inventar rendimiento', () => {
    const sinInteres = inversion({ rate: InterestRate.zero() })
    expect(sinInteres.valueAt(utc('2027-01-15')).minorUnits).toBe(1_000_000n)
  })

  it('rechaza un plazo fijo sin fecha de vencimiento', () => {
    expect(isErr(Investment.create({ ...props, kind: 'FIXED_TERM', maturesAt: null }))).toBe(true)
  })

  it('rechaza un vencimiento anterior a la apertura', () => {
    expect(isErr(Investment.create({ ...props, maturesAt: utc('2025-01-01') }))).toBe(true)
  })

  it('rechaza un capital no positivo y un aporte de otra moneda', () => {
    expect(isErr(Investment.create({ ...props, principal: crc(0n) }))).toBe(true)
    expect(isErr(inversion().addContribution(aporteUsd()))).toBe(true)
  })
})
```

El aporte que capitaliza desde su propia fecha es el caso que distingue una implementación correcta de una que multiplica todo el capital acumulado por el factor completo. ₡10.000 a seis meses dan 10.000 × 1,01⁶ = ₡10.615,20, o sea 1.061.520 céntimos.

Que una inversión a plazo deje de capitalizar al vencer también importa: después del vencimiento la plata está disponible, no rindiendo.

- [x] **Paso 2: Implementar**

```ts
// Valor = P·(1+i)^n, con n en meses completos. Cada aporte capitaliza desde su
// propia fecha: multiplicar el acumulado por el factor completo sobrestimaría.
export const compoundedValue = (principal: Money, monthlyRate: Decimal, months: number): Money => {
  if (months <= 0) return principal
  return Money.fromDecimal(
    principal.toDecimal().mul(monthlyRate.plus(1).pow(months)),
    principal.currency,
  )
}
```

`valueAt` acota la fecha al vencimiento cuando la inversión es a plazo, cuenta los meses completos entre cada capital y esa fecha, y suma los valores capitalizados del principal y de cada aporte.

- [x] **Paso 3: Persistir y exponer**

Esquema con `investments` e `investment_contributions`, montos en `BigInt`, tasa en `Decimal(9,6)`, fechas en `@db.Date`. API: `GET|POST /investments`, `GET|PATCH|DELETE /investments/:id`, `POST /investments/:id/contributions` y `GET /investments/:id/projection?at=YYYY-MM-DD`.

Al vencer una inversión, el caso de uso emite `InvestmentMatured`.

- [x] **Paso 4: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: inversiones con capitalización y valor proyectado"
```

**Acceptance criteria:**
- [x] El valor a 3 y a 12 meses coincide con el cálculo hecho a mano
- [x] Un aporte capitaliza desde su fecha, no desde la apertura
- [x] Una inversión a plazo deja de capitalizar al vencer
- [x] Una tasa de 0 % mantiene el capital
- [x] Un plazo fijo sin vencimiento es rechazado

---

### Tarea 5: Proyección de flujo de caja

**Descripción:** El módulo que coordina a todos los demás a través de sus puertos, sin persistencia propia. Proyecta N meses y reporta, por mes, el ingreso, el egreso comprometido, el excedente y qué cuotas se liberan. El valor no está en el total sino en saber en qué mes cambia cada cosa.

**Alcance:** M · **Dependencias:** Tareas 2, 3 y 4

**Files:**
- Create: `api/src/modules/projection/application/cash-flow-projection.use-case.ts`, `monthly-flow.ts`
- Create: `api/src/modules/projection/infrastructure/projections.controller.ts`, `projection.schemas.ts`
- Create: `api/src/modules/projection/projection.module.ts`
- Test: `api/src/modules/projection/application/cash-flow-projection.spec.ts`

**Interfaces:**
- Consumes: `DebtRepository`, `GoalRepository`, `InvestmentRepository`, el ingreso estimado y el gasto del mes
- Produces:
  - `interface FreedInstallment { debtId: string; name: string; amount: Money }`
  - `interface MonthlyFlow { year; month; income: Money; committed: Money; surplus: Money; debtPayments: Money; lentCollections: Money; goalContributions: Money; maturingInvestments: Money; estimatedSpending: Money; freed: FreedInstallment[] }`
  - `CashFlowProjectionUseCase.execute(months: number, from?: Date, currency?: CurrencyCode): Promise<MonthlyFlow[]>`
  - `GET /api/v1/projections?months=N&currency=CRC`

- [x] **Paso 1: Escribir el test que falla**

```ts
describe('CashFlowProjectionUseCase', () => {
  it('proyecta la cantidad de meses pedida, empezando por el actual', async () => {
    const flow = await useCase.execute(6, utc('2026-09-01'))

    expect(flow).toHaveLength(6)
    expect(flow[0]).toMatchObject({ year: 2026, month: 9 })
    expect(flow[5]).toMatchObject({ year: 2027, month: 2 })
  })

  it('la cuota de una deuda propia es egreso comprometido', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })
    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.debtPayments.minorUnits).toBe(3_400_221n)
    expect(flow[0]?.committed.minorUnits).toBeGreaterThanOrEqual(3_400_221n)
  })

  it('la cuota de un préstamo otorgado es ingreso, no egreso', async () => {
    debts.findAll.mockResolvedValue({ items: [prestamoOtorgadoDe3Cuotas()], totalItems: 1 })
    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.lentCollections.minorUnits).toBe(3_400_221n)
    expect(flow[0]?.debtPayments.isZero()).toBe(true)
    expect(flow[0]?.income.minorUnits).toBeGreaterThanOrEqual(3_400_221n)
  })

  it('reporta qué cuotas se liberan y en qué mes', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })
    const flow = await useCase.execute(6, utc('2026-02-01'))

    expect(flow[2]?.freed).toEqual([])
    expect(flow[3]?.freed.map((f) => f.name)).toEqual(['Préstamo corto'])
    expect(flow[3]?.freed[0]?.amount.minorUnits).toBe(3_400_222n)
  })

  it('el mes siguiente a liberarse una cuota tiene más excedente', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })
    const flow = await useCase.execute(6, utc('2026-02-01'))

    expect(flow[3]!.surplus.minorUnits).toBeGreaterThan(flow[2]!.surplus.minorUnits)
  })

  it('el vencimiento de una inversión entra como ingreso en su mes', async () => {
    investments.findAll.mockResolvedValue([inversionQueVenceEnMarzo()])
    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.maturingInvestments.isZero()).toBe(true)
    expect(flow[1]?.maturingInvestments.minorUnits).toBeGreaterThan(0n)
  })

  it('los aportes a metas son egreso comprometido', async () => {
    goals.findAll.mockResolvedValue([metaConAporteMensual(200_000_00n)])
    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.goalContributions.minorUnits).toBe(200_000_00n)
  })

  it('el excedente es ingreso menos comprometido, y puede ser negativo', async () => {
    const flow = await useCase.execute(1, utc('2026-02-01'))
    const mes = flow[0]!

    expect(mes.surplus.minorUnits).toBe(mes.income.minorUnits - mes.committed.minorUnits)
  })

  it('sin nada cargado proyecta meses en cero, no falla', async () => {
    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow).toHaveLength(3)
    expect(flow[0]?.committed.isZero()).toBe(true)
  })

  it('rechaza una cantidad de meses no positiva o excesiva', async () => {
    await expect(useCase.execute(0)).rejects.toThrow()
    await expect(useCase.execute(1000)).rejects.toThrow()
  })
})
```

Los dos casos centrales son la dirección del préstamo otorgado —ingreso, no egreso— y las cuotas que se liberan con el excedente que sube el mes siguiente. Ese par es la razón de ser del módulo.

- [x] **Paso 2: Implementar**

`CashFlowProjectionUseCase` recorre los meses y, por cada uno, pregunta a cada deuda su cuota de ese mes —separando por dirección—, a cada meta su aporte requerido, a cada inversión si vence, y lee el ingreso estimado y el gasto del mes.

Una cuota se considera liberada en el mes **siguiente** al de su última cuota: es cuando el dinero queda disponible.

`projection` no tiene repositorio propio y no importa el `domain/` de ningún otro módulo: consume los puertos de repositorio, que devuelven agregados, y les pregunta.

- [x] **Paso 3: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: proyección de flujo de caja mes a mes"
```

**Acceptance criteria:**
- [x] La cuota de un préstamo otorgado suma al ingreso, no al egreso
- [x] Las cuotas liberadas se reportan con su mes y su monto
- [x] El excedente sube el mes siguiente a liberarse una cuota
- [x] El vencimiento de una inversión entra como ingreso en su mes
- [x] Sin datos cargados proyecta en cero sin fallar
- [x] `projection` no importa el `domain/` de ningún otro módulo

---

### Tarea 6: Pantallas de presupuesto y metas

**Descripción:** La evaluación del mes contra el modelo activo, el editor de modelos, y las metas con su fecha proyectada contra la deseada.

**Alcance:** L · **Dependencias:** Tarea 3, Tarea 10 de la rebanada 1

**Files:**
- Create: `web/src/routes/presupuesto.tsx`, `presupuesto.modelos.tsx`, `metas.tsx`, `metas.$goalId.tsx`
- Create: `web/src/features/budget/*`, `web/src/features/goals/*`

- [x] **Paso 1: Copy y composición**

Regenerar tipos. Cargar las skills de F1. Todo el texto con `copywriting`, en `copy.ts` por módulo. Resolver la composición con `impeccable shape` antes del JSX.

- [x] **Paso 2: Evaluación del mes**

Por cubeta: lo asignado, lo consumido y la desviación, con su estado. El gráfico usa el componente `chart` de shadcn, nunca Recharts directo, y va **acompañado** de los números exactos.

Lo que tiene que quedar claro de un vistazo es cuál cubeta se pasó. Eso se logra con jerarquía, no pintando tres barras de colores iguales: el estado `OVER` merece peso visual, `ON_TRACK` no merece ninguno.

Cada cubeta enlaza a los movimientos que la componen, filtrados por sus cuentas. Un número de gasto sin forma de ver qué lo compone obliga a confiar, y la contabilidad existe para no tener que confiar.

Sin modelo activo o sin ingreso declarado del mes, estados vacíos que dicen qué falta y llevan a hacerlo.

- [x] **Paso 3: Editor de modelos**

Cubetas con nombre, porcentaje, marca de ahorro y cuentas asociadas. La suma de los porcentajes se muestra **mientras se edita**, y guardar está deshabilitado hasta que dé 100. El backend valida igual, pero que el usuario descubra el error al enviar es una mala interfaz.

- [x] **Paso 4: Metas**

Lista con avance, aporte requerido y fecha proyectada. Lo importante es la relación entre la fecha proyectada y la deseada, no el porcentaje: una barra al 60 % no dice si se llega.

Sin aportes, se muestra que todavía no hay ritmo para proyectar, y no una fecha inventada.

Detalle con historial de aportes y alta de aporte. Al alcanzarse, la meta lo celebra una vez, con mesura: la regla F6 sigue siendo minimalismo.

- [x] **Paso 5: Puerta de calidad y commit**

Aplicar el Paso 9 de la Tarea 11 de la rebanada 1. Capturas en los dos temas y los tres anchos, `impeccable critique`, `audit` y `polish`.

```bash
cd web && npm test && npm run typecheck && npm run build
git add web
git commit -m "✨ feat: pantallas de presupuesto y metas"
```

**Acceptance criteria:**
- [x] La cubeta pasada se distingue por jerarquía, no por tres barras iguales
- [x] Cada cubeta enlaza a los movimientos que la componen
- [x] El editor muestra la suma de porcentajes mientras se edita
- [x] Una meta sin aportes no muestra fecha proyectada inventada
- [x] Los cinco estados de cada pantalla existen

---

### Tarea 7: Pantallas de inversiones y proyección

**Descripción:** Las dos últimas vistas de la fase 1. La de proyección es la que responde la pregunta que originó el sistema: en qué mes cambia cada cosa.

**Alcance:** L · **Dependencias:** Tareas 4 y 5

**Files:**
- Create: `web/src/routes/inversiones.tsx`, `inversiones.$investmentId.tsx`, `proyeccion.tsx`
- Create: `web/src/features/investments/*`, `web/src/features/projection/*`

- [x] **Paso 1: Copy y composición**

Como en la Tarea 6. En proyección, además, resolver con `impeccable shape` cómo se representan doce a veinticuatro meses sin que sea una tabla de veinticuatro filas iguales.

- [x] **Paso 2: Inversiones**

Lista con capital, tasa, valor actual y, para las de plazo, cuánto falta para el vencimiento. Detalle con la curva de capitalización —componente `chart` de shadcn— y el desglose de capital contra interés ganado.

Una inversión vencida se distingue de una vigente: su plata ya está disponible y eso cambia qué hacer con ella.

- [x] **Paso 3: Proyección**

El selector de horizonte y, por mes: ingreso, egreso comprometido y excedente. Los meses en que se libera una cuota se marcan, porque son el dato que la pantalla existe para mostrar.

Un mes con excedente negativo se distingue con claridad: es el mes que no cierra, y enterarse con seis meses de anticipación es todo el valor de proyectar.

Bajo 768 px, no es una tabla de veinticuatro filas con desplazamiento: es una lista donde cada mes es una fila con su excedente y las liberaciones destacadas.

- [x] **Paso 4: Panel general**

La ruta raíz reúne lo que Emilio mira primero: tipo de cambio del día, excedente del mes en curso, la cubeta más pasada del presupuesto, la próxima cuota que se libera y la meta más cercana.

**No es una fila de cuatro tarjetas de métricas.** Esa plantilla está prohibida por la regla F9 y acá es donde más tienta. Resolver la composición con `impeccable shape` y, si el resultado se parece a un tablero de SaaS, rehacerlo.

- [x] **Paso 5: Puerta de calidad final**

Además de la puerta de calidad habitual, pasada completa sobre **todas** las pantallas de la fase 1, no solo las nuevas: `impeccable polish web/src` y una revisión de que las cuatro rebanadas se ven como un mismo producto y no como cuatro proyectos pegados.

- [x] **Paso 6: Commit**

```bash
cd web && npm test && npm run typecheck && npm run build
git add web
git commit -m "✨ feat: pantallas de inversiones, proyección y panel general"
```

**Acceptance criteria:**
- [x] Los meses con cuotas liberadas se distinguen en la proyección
- [x] Un mes con excedente negativo se ve sin buscarlo
- [x] Una inversión vencida se distingue de una vigente
- [x] El panel general no es una fila de tarjetas de métricas
- [x] Las cuatro rebanadas se ven como un mismo producto

---

### Checkpoint: fase 1 completa

- [x] `cd api && npm test` y `cd web && npm test` en verde
- [x] Las seis preguntas del propósito del spec tienen respuesta en pantalla
- [x] Un gasto cargado como movimiento llega hasta la evaluación de presupuesto — verificado en pantalla el 2026-09-21: un gasto de ₡45.000 en 6100 aparece como consumo de Necesidades
- [x] La proyección muestra en qué mes se libera cada cuota — cubierto por el test de `CashFlowProjectionUseCase`; con los datos cargados hoy ninguna deuda vence dentro del horizonte
- [ ] Revisión completa con Emilio

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El consumo de una cubeta se calcula sumando débitos y no el neto | Medio | Test del reintegro en la Tarea 2 |
| El proveedor cuenta el gasto dos veces al incluir la contraparte | Alto | Test que solo mapea cuentas de gasto y verifica que la de activo se ignora |
| Los aportes a una inversión capitalizan desde la apertura y no desde su fecha | Alto | Test con aporte a mitad de plazo y número calculado a mano |
| Las pantallas de proyección y panel caen en la plantilla de tablero | Alto | `impeccable shape` obligatorio antes del JSX, y criterio de rechazo explícito |
| `projection` termina importando el dominio de otro módulo | Medio | La regla de ESLint de la Tarea 1 de la rebanada 1 lo bloquea |

## Preguntas abiertas

- Ninguna bloqueante.
