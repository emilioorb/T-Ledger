# Fase 1 · Rebanada 2 — Tipos de cambio del BCCR · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el sistema convierta entre colones y dólares con la tasa del BCCR vigente en cualquier fecha, sin que la disponibilidad del banco central bloquee nunca una operación.

**Architecture:** Módulo `money` con dominio rico. `ExchangeRateProviderPort` es el puerto; `BccrExchangeRateAdapter` habla SOAP contra el BCCR, valida la respuesta con Zod antes de usarla y nunca deja pasar un XML sin verificar. Las tasas se persisten siempre; la conversión lee de la base y jamás toca la red. Un job diario sincroniza y rellena huecos.

**Tech Stack:** Lo mismo que la rebanada 1, más `@nestjs/schedule` y `fast-xml-parser`.

**Spec:** `docs/superpowers/specs/2026-09-20-finanzas-personales-design.md`, sección 6

**Planes hermanos (ejecutar en este orden):**

1. `2026-09-20-fase1-fundacion-y-deudas.md`
2. `2026-09-20-fase1-tipos-de-cambio.md` (BCCR)
3. `2026-09-20-fase1-contabilidad.md`
4. `2026-09-20-fase1-presupuesto-metas-inversiones-proyeccion.md`

**Requiere:** `2026-09-20-fase1-fundacion-y-deudas.md` completo. Esta rebanada reusa el kernel (`Money`, `DateRange`, `Result`), los bordes HTTP y el `PrismaService`.

---

## Global Constraints

Valen todas las restricciones del plan de la rebanada 1: versiones pineadas, reglas de backend 1–11 y reglas de frontend F1–F12. Se suman estas:

| Paquete | Versión |
|---|---|
| `@nestjs/schedule` | `12.0.2` |
| `fast-xml-parser` | `5.11.1` |

### Lo que este plan da por cierto, y cómo se verifica

Los datos del servicio del BCCR salen de la sección 6 del spec y se contrastaron contra implementaciones públicas. Dos cosas que el spec no decía y que son fuente de fallo silencioso:

1. **Las fechas van en `dd/mm/yyyy`**, no en ISO. Una fecha en formato ISO no produce un error: produce una respuesta vacía.
2. **La respuesta llega como XML escapado dentro de un nodo**, no como XML anidado. Hay que desescaparla antes de parsearla.

Los nombres de los parámetros del método (`tcIndicador`, `tcFechaInicio`, `tcFechaFinal`, `tcNombre`, `tnSubNiveles`, `tcCorreoElectronico`, `tcToken`) se confirman contra el WSDL vivo en el Paso 1 de la Tarea 2, antes de escribir el adaptador. Es el único dato del plan que no se pudo verificar sin credenciales, y por eso se verifica primero.

### La razón de ser de la validación con Zod

El servicio **devuelve vacío en lugar de error cuando falta un parámetro o el token es inválido**. Sin validación, una credencial mal configurada se manifiesta como «hoy no hay datos» y el sistema sigue andando con tasas viejas durante semanas sin que nadie se entere. La validación convierte ese silencio en un error explícito y registrado. No es una formalidad: es el requisito central de esta rebanada.

### Fuentes consultadas

- Servicio y códigos de indicador: https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx
- Parámetros y formato de fecha, implementación pública de referencia: https://github.com/arielcr/indicadores-bccr/blob/master/Indicador.php
- Suscripción y token: https://www.impulsait.com/como-suscribirse-al-webservice-de-indicadores-economicos-del-banco-central-de-costa-rica-para-obtener-el-tipo-de-cambio/
- `@Cron` con `timeZone`: https://github.com/nestjs/docs.nestjs.com/blob/master/content/techniques/task-scheduling.md
- Formateo de errores de Zod 4: https://zod.dev/error-formatting

### Mapa de archivos

```
api/src/modules/money/
├── domain/
│   ├── exchange-rate.ts              entidad y tipo de indicador
│   ├── exchange-rate-repository.port.ts
│   ├── exchange-rate-provider.port.ts
│   └── currency-converter.ts         conversión pura
├── application/
│   ├── convert-money.use-case.ts
│   ├── get-latest-rates.use-case.ts
│   ├── list-rates.use-case.ts
│   └── sync-exchange-rates.use-case.ts   backfill y tolerancia a fallos
└── infrastructure/
    ├── bccr/
    │   ├── bccr.config.ts            credenciales validadas al arrancar
    │   ├── bccr-soap.client.ts       petición y desescapado
    │   ├── bccr-response.schema.ts   Zod sobre el XML parseado
    │   └── bccr-exchange-rate.adapter.ts
    ├── prisma-exchange-rate.repository.ts
    ├── exchange-rates.controller.ts
    ├── exchange-rate.schemas.ts
    └── exchange-rates-sync.job.ts
api/test/fixtures/bccr/
├── respuesta-valida.xml
├── respuesta-vacia.xml               credencial inválida
├── respuesta-un-dia.xml
└── respuesta-con-feriado.xml
```

---

## Tareas

### Tarea 1: Dominio de tipos de cambio y conversión

**Descripción:** La entidad, los dos puertos y la conversión pura. La regla que define el módulo: *la tasa vigente en la fecha X es la última publicación con fecha menor o igual a X*, porque el BCCR no publica fines de semana ni feriados. Esa regla es la que hace que un lunes feriado no devuelva «sin datos».

**Alcance:** S · **Dependencias:** kernel de la rebanada 1

**Files:**
- Create: `api/src/modules/money/domain/exchange-rate.ts`, `exchange-rate-repository.port.ts`, `exchange-rate-provider.port.ts`, `currency-converter.ts`
- Test: `api/src/modules/money/domain/exchange-rate.spec.ts`, `currency-converter.spec.ts`

**Interfaces:**
- Consumes: `Money`, `DateRange`, `Result`, `CurrencyCode` del kernel
- Produces:
  - `const RATE_INDICATORS = { BUY: '317', SELL: '318' } as const`, `type RateIndicator = '317' | '318'`
  - `class ExchangeRate`: `static create(props)` → `Result<ExchangeRate, RangeError>` · `readonly indicator`, `readonly value: Decimal`, `readonly publishedAt: Date` · `isStalerThan(days: number, now: Date): boolean`
  - `interface ExchangeRateRepository { findEffectiveAt(indicator, date): Promise<ExchangeRate | null>; findLatest(indicator): Promise<ExchangeRate | null>; findInRange(indicator, range): Promise<ExchangeRate[]>; saveMany(rates): Promise<number> }` y `const EXCHANGE_RATE_REPOSITORY: unique symbol`
  - `interface ExchangeRateProviderPort { fetchRates(range: DateRange): Promise<ExchangeRate[]> }` y `const EXCHANGE_RATE_PROVIDER: unique symbol`
  - `convert(amount: Money, to: CurrencyCode, rate: ExchangeRate): Result<Money, RangeError>`

- [ ] **Paso 1: Escribir los tests que fallan**

`api/src/modules/money/domain/exchange-rate.spec.ts`:

```ts
import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { ExchangeRate } from './exchange-rate.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const rate = (value: string, publishedAt: string) =>
  unwrap(ExchangeRate.create({ indicator: '317', value: new Decimal(value), publishedAt: utc(publishedAt) }))

describe('ExchangeRate', () => {
  it('guarda el valor como decimal exacto', () => {
    expect(rate('512.345678', '2026-09-18').value.toString()).toBe('512.345678')
  })

  it('normaliza la publicación al día, sin hora', () => {
    const created = unwrap(
      ExchangeRate.create({
        indicator: '318',
        value: new Decimal('520'),
        publishedAt: new Date('2026-09-18T15:42:11.000Z'),
      }),
    )
    expect(created.publishedAt.toISOString()).toBe('2026-09-18T00:00:00.000Z')
  })

  it('rechaza un valor no positivo', () => {
    expect(isErr(ExchangeRate.create({ indicator: '317', value: new Decimal(0), publishedAt: utc('2026-09-18') }))).toBe(true)
    expect(isErr(ExchangeRate.create({ indicator: '317', value: new Decimal(-1), publishedAt: utc('2026-09-18') }))).toBe(true)
  })

  it('reconoce cuándo está desactualizada', () => {
    const viernes = rate('512', '2026-09-18')
    expect(viernes.isStalerThan(2, utc('2026-09-19'))).toBe(false)
    expect(viernes.isStalerThan(2, utc('2026-09-25'))).toBe(true)
  })
})
```

`api/src/modules/money/domain/currency-converter.spec.ts`:

```ts
import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { convert } from './currency-converter.js'
import { ExchangeRate } from './exchange-rate.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const venta = unwrap(
  ExchangeRate.create({ indicator: '318', value: new Decimal('520.50'), publishedAt: utc('2026-09-18') }),
)

describe('convert', () => {
  it('convierte dólares a colones con la tasa de venta', () => {
    const result = unwrap(convert(Money.fromMinorUnits(10_000n, 'USD'), 'CRC', venta))
    expect(result.currency).toBe('CRC')
    expect(result.minorUnits).toBe(5_205_000n)
  })

  it('convierte colones a dólares dividiendo por la tasa', () => {
    const result = unwrap(convert(Money.fromMinorUnits(5_205_000n, 'CRC'), 'USD', venta))
    expect(result.minorUnits).toBe(10_000n)
  })

  it('devuelve el mismo monto si la moneda destino es la de origen', () => {
    const original = Money.fromMinorUnits(12_345n, 'CRC')
    expect(unwrap(convert(original, 'CRC', venta)).minorUnits).toBe(12_345n)
  })

  it('falla si el par no corresponde a la tasa recibida', () => {
    expect(isErr(convert(Money.fromMinorUnits(100n, 'CRC'), 'CRC', venta))).toBe(false)
  })

  it('redondea a la unidad mínima sin perder el resto en el aire', () => {
    const result = unwrap(convert(Money.fromMinorUnits(1n, 'USD'), 'CRC', venta))
    expect(result.minorUnits).toBe(521n)
  })
})
```

- [ ] **Paso 2: Correr y confirmar que fallan**

```bash
cd api && npm test -- exchange-rate currency-converter
```

- [ ] **Paso 3: Implementar la entidad**

`api/src/modules/money/domain/exchange-rate.ts`:

```ts
import type { Decimal } from 'decimal.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'

export const RATE_INDICATORS = { BUY: '317', SELL: '318' } as const

export type RateIndicator = (typeof RATE_INDICATORS)[keyof typeof RATE_INDICATORS]

export interface ExchangeRateProps {
  readonly indicator: RateIndicator
  readonly value: Decimal
  readonly publishedAt: Date
}

const MS_PER_DAY = 86_400_000

const atUtcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export class ExchangeRate {
  private constructor(
    readonly indicator: RateIndicator,
    readonly value: Decimal,
    readonly publishedAt: Date,
  ) {}

  static create(props: ExchangeRateProps): Result<ExchangeRate, RangeError> {
    if (!props.value.isFinite() || props.value.lessThanOrEqualTo(0)) {
      return err(new RangeError(`Una tasa debe ser mayor que cero, se recibió ${props.value.toString()}`))
    }
    if (Number.isNaN(props.publishedAt.getTime())) {
      return err(new RangeError('La tasa recibió una fecha de publicación inválida'))
    }
    // Una publicación del BCCR es un día, no un instante.
    return ok(new ExchangeRate(props.indicator, props.value, atUtcMidnight(props.publishedAt)))
  }

  isStalerThan(days: number, now: Date): boolean {
    return (atUtcMidnight(now).getTime() - this.publishedAt.getTime()) / MS_PER_DAY > days
  }
}
```

- [ ] **Paso 4: Implementar la conversión**

`api/src/modules/money/domain/currency-converter.ts`:

```ts
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { ExchangeRate } from './exchange-rate.js'

// La tasa del BCCR expresa colones por dólar. Convertir a colones multiplica; a dólares divide.
export const convert = (
  amount: Money,
  to: CurrencyCode,
  rate: ExchangeRate,
): Result<Money, RangeError> => {
  if (amount.currency === to) return ok(amount)

  if (amount.currency === 'USD' && to === 'CRC') {
    return ok(Money.fromDecimal(amount.toDecimal().mul(rate.value), 'CRC'))
  }
  if (amount.currency === 'CRC' && to === 'USD') {
    return ok(Money.fromDecimal(amount.toDecimal().div(rate.value), 'USD'))
  }
  return err(new RangeError(`No hay conversión definida de ${amount.currency} a ${to}`))
}
```

- [ ] **Paso 5: Declarar los puertos**

`api/src/modules/money/domain/exchange-rate-repository.port.ts`:

```ts
import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { ExchangeRate, RateIndicator } from './exchange-rate.js'

export interface ExchangeRateRepository {
  // «Vigente en la fecha X» es la última publicación con fecha menor o igual a X:
  // el BCCR no publica fines de semana ni feriados.
  findEffectiveAt(indicator: RateIndicator, date: Date): Promise<ExchangeRate | null>
  findLatest(indicator: RateIndicator): Promise<ExchangeRate | null>
  findInRange(indicator: RateIndicator, range: DateRange): Promise<ExchangeRate[]>
  saveMany(rates: readonly ExchangeRate[]): Promise<number>
}

export const EXCHANGE_RATE_REPOSITORY = Symbol('EXCHANGE_RATE_REPOSITORY')
```

`api/src/modules/money/domain/exchange-rate-provider.port.ts`:

```ts
import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { ExchangeRate } from './exchange-rate.js'

export interface ExchangeRateProviderPort {
  fetchRates(range: DateRange): Promise<ExchangeRate[]>
}

export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER')
```

- [ ] **Paso 6: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api/src/modules/money
git commit -m "✨ feat: dominio de tipos de cambio y conversión entre monedas"
```

**Acceptance criteria:**
- [ ] La publicación se normaliza a medianoche UTC
- [ ] Una tasa de cero o negativa es rechazada con `Err`
- [ ] Convertir a la misma moneda devuelve el mismo monto sin tocar la tasa
- [ ] Ningún archivo del dominio importa Nest, Prisma ni HTTP

---

### Tarea 2: Adaptador del BCCR

**Descripción:** El adaptador SOAP y su validación. Es la tarea de mayor riesgo del plan y por eso empieza confirmando el contrato contra el WSDL vivo en lugar de confiar en la memoria. Se prueba contra respuestas XML grabadas, incluida la respuesta vacía que devuelve el servicio cuando el token es inválido.

**Alcance:** M · **Dependencias:** Tarea 1

**Files:**
- Create: `api/src/modules/money/infrastructure/bccr/bccr.config.ts`, `bccr-soap.client.ts`, `bccr-response.schema.ts`, `bccr-exchange-rate.adapter.ts`
- Create: `api/test/fixtures/bccr/respuesta-valida.xml`, `respuesta-vacia.xml`, `respuesta-un-dia.xml`
- Test: `api/src/modules/money/infrastructure/bccr/bccr-response.schema.spec.ts`, `bccr-exchange-rate.adapter.spec.ts`

**Interfaces:**
- Consumes: `ExchangeRate`, `ExchangeRateProviderPort`, `DateRange`
- Produces:
  - `bccrConfigSchema` y `loadBccrConfig(source): BccrConfig` con `{ endpoint, email, token }`
  - `class BccrSoapClient` — `call(indicator: RateIndicator, range: DateRange): Promise<string>` devuelve el XML interno ya desescapado
  - `parseBccrResponse(xml: string, indicator: RateIndicator): ExchangeRate[]` — lanza `BccrEmptyResponseError` si viene vacío
  - `class BccrEmptyResponseError extends Error`
  - `class BccrExchangeRateAdapter implements ExchangeRateProviderPort`

- [ ] **Paso 1: Confirmar el contrato contra el WSDL vivo**

Antes de escribir una línea:

```bash
curl -s "https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx?WSDL" \
  | tr '>' '>\n' | grep -A2 -i "ObtenerIndicadoresEconomicos"
```

Anotar los nombres exactos y el orden de los parámetros de `ObtenerIndicadoresEconomicos`. Lo esperado, según implementaciones públicas, es `tcIndicador`, `tcFechaInicio`, `tcFechaFinal`, `tcNombre`, `tnSubNiveles`, `tcCorreoElectronico`, `tcToken`. **Si el WSDL dice otra cosa, manda el WSDL** y se ajustan los pasos 5 y 6.

Este paso existe porque el servicio no rechaza un parámetro mal nombrado: devuelve vacío. Un nombre equivocado no se descubre con un error, se descubre meses después notando que no hay tasas.

- [ ] **Paso 2: Grabar las respuestas de referencia**

Con credenciales válidas en `.env`, capturar una respuesta real y guardarla en `api/test/fixtures/bccr/respuesta-valida.xml`. Si todavía no hay credenciales, construir el archivo con esta forma, que es la que documenta el servicio:

`api/test/fixtures/bccr/respuesta-valida.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<string xmlns="https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/">
  &lt;Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;
    &lt;INGC011_CAT_INDICADORECONOMIC&gt;
      &lt;COD_INDICADORINTERNO&gt;317&lt;/COD_INDICADORINTERNO&gt;
      &lt;DES_FECHA&gt;2026-09-16T00:00:00-06:00&lt;/DES_FECHA&gt;
      &lt;NUM_VALOR&gt;508.19000000&lt;/NUM_VALOR&gt;
    &lt;/INGC011_CAT_INDICADORECONOMIC&gt;
    &lt;INGC011_CAT_INDICADORECONOMIC&gt;
      &lt;COD_INDICADORINTERNO&gt;317&lt;/COD_INDICADORINTERNO&gt;
      &lt;DES_FECHA&gt;2026-09-17T00:00:00-06:00&lt;/DES_FECHA&gt;
      &lt;NUM_VALOR&gt;508.45000000&lt;/NUM_VALOR&gt;
    &lt;/INGC011_CAT_INDICADORECONOMIC&gt;
    &lt;INGC011_CAT_INDICADORECONOMIC&gt;
      &lt;COD_INDICADORINTERNO&gt;317&lt;/COD_INDICADORINTERNO&gt;
      &lt;DES_FECHA&gt;2026-09-18T00:00:00-06:00&lt;/DES_FECHA&gt;
      &lt;NUM_VALOR&gt;508.02000000&lt;/NUM_VALOR&gt;
    &lt;/INGC011_CAT_INDICADORECONOMIC&gt;
  &lt;/Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;
</string>
```

`api/test/fixtures/bccr/respuesta-vacia.xml` — lo que devuelve el servicio con un token inválido o un parámetro faltante:

```xml
<?xml version="1.0" encoding="utf-8"?>
<string xmlns="https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/"></string>
```

`api/test/fixtures/bccr/respuesta-un-dia.xml` — un solo registro, para el caso del backfill de un día:

```xml
<?xml version="1.0" encoding="utf-8"?>
<string xmlns="https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/">
  &lt;Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;
    &lt;INGC011_CAT_INDICADORECONOMIC&gt;
      &lt;COD_INDICADORINTERNO&gt;318&lt;/COD_INDICADORINTERNO&gt;
      &lt;DES_FECHA&gt;2026-09-18T00:00:00-06:00&lt;/DES_FECHA&gt;
      &lt;NUM_VALOR&gt;515.30000000&lt;/NUM_VALOR&gt;
    &lt;/INGC011_CAT_INDICADORECONOMIC&gt;
  &lt;/Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;
</string>
```

Cuando lleguen las credenciales, reemplazar `respuesta-valida.xml` por una captura real y correr los tests: si cambia algo de la forma, los tests lo dicen de inmediato.

- [ ] **Paso 3: Escribir el test del parser que falla**

```bash
cd api && npm install fast-xml-parser@5.11.1
```

`api/src/modules/money/infrastructure/bccr/bccr-response.schema.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BccrEmptyResponseError, parseBccrResponse } from './bccr-response.schema.js'

const fixture = (name: string) =>
  readFileSync(new URL(`../../../../../test/fixtures/bccr/${name}`, import.meta.url), 'utf8')

describe('parseBccrResponse', () => {
  it('extrae una tasa por día publicado', () => {
    const rates = parseBccrResponse(fixture('respuesta-valida.xml'), '317')

    expect(rates).toHaveLength(3)
    expect(rates[0]?.value.toString()).toBe('508.19')
    expect(rates[0]?.publishedAt.toISOString()).toBe('2026-09-16T00:00:00.000Z')
    expect(rates[0]?.indicator).toBe('317')
  })

  it('conserva la fecha publicada sin correrla de día por la zona horaria', () => {
    const rates = parseBccrResponse(fixture('respuesta-valida.xml'), '317')
    expect(rates.map((r) => r.publishedAt.toISOString().slice(0, 10))).toEqual([
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
    ])
  })

  it('acepta una respuesta de un solo registro', () => {
    expect(parseBccrResponse(fixture('respuesta-un-dia.xml'), '318')).toHaveLength(1)
  })

  it('convierte la respuesta vacía en un error explícito', () => {
    expect(() => parseBccrResponse(fixture('respuesta-vacia.xml'), '317')).toThrow(
      BccrEmptyResponseError,
    )
  })

  it('rechaza un XML con un valor que no es numérico', () => {
    const corrupto = fixture('respuesta-valida.xml').replace('508.19000000', 'no es un número')
    expect(() => parseBccrResponse(corrupto, '317')).toThrow()
  })

  it('rechaza un XML que no tiene la forma esperada', () => {
    expect(() => parseBccrResponse('<string>&lt;otraCosa/&gt;</string>', '317')).toThrow()
  })
})
```

La fecha viene con desplazamiento `-06:00`. Si el parser usa `new Date(...)` y luego toma el día local, el 16 de septiembre se convierte en el 15 o el 16 según dónde corra el proceso. El test de la zona horaria es el que atrapa eso.

- [ ] **Paso 4: Implementar el parser validado**

`api/src/modules/money/infrastructure/bccr/bccr-response.schema.ts`:

```ts
import { Decimal } from 'decimal.js'
import { XMLParser } from 'fast-xml-parser'
import { z } from 'zod'
import { unwrap } from '../../../../shared/kernel/result.js'
import { ExchangeRate, type RateIndicator } from '../../domain/exchange-rate.js'

export class BccrEmptyResponseError extends Error {
  readonly code = 'BCCR_EMPTY_RESPONSE'

  constructor() {
    super(
      'El BCCR devolvió una respuesta vacía. Suele significar credencial inválida o parámetro faltante, no ausencia de datos.',
    )
    this.name = 'BccrEmptyResponseError'
  }
}

const recordSchema = z.object({
  COD_INDICADORINTERNO: z.coerce.string(),
  DES_FECHA: z.string().min(1),
  NUM_VALOR: z.coerce.string().regex(/^\d+(\.\d+)?$/, { error: 'NUM_VALOR debe ser numérico' }),
})

const payloadSchema = z.object({
  Datos_de_INGC011_CAT_INDICADORECONOMIC: z.object({
    INGC011_CAT_INDICADORECONOMIC: z.union([recordSchema, z.array(recordSchema)]),
  }),
})

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true })

// La fecha llega como 2026-09-16T00:00:00-06:00. Se toma la parte de fecha tal cual:
// interpretarla como instante la correría de día según dónde corra el proceso.
const toUtcDay = (raw: string): Date => {
  const [datePart] = raw.split('T')
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new RangeError(`Fecha de publicación con formato inesperado: ${raw}`)
  }
  return new Date(`${datePart}T00:00:00.000Z`)
}

export const parseBccrResponse = (xml: string, indicator: RateIndicator): ExchangeRate[] => {
  const envelope: unknown = parser.parse(xml)
  const inner = extractInnerXml(envelope)

  if (inner.trim().length === 0) throw new BccrEmptyResponseError()

  const payload = payloadSchema.safeParse(parser.parse(inner))
  if (!payload.success) {
    throw new Error(`El BCCR devolvió un XML inesperado:\n${z.prettifyError(payload.error)}`)
  }

  const records = payload.data.Datos_de_INGC011_CAT_INDICADORECONOMIC.INGC011_CAT_INDICADORECONOMIC
  const list = Array.isArray(records) ? records : [records]

  return list.map((record) =>
    unwrap(
      ExchangeRate.create({
        indicator,
        value: new Decimal(record.NUM_VALOR),
        publishedAt: toUtcDay(record.DES_FECHA),
      }),
    ),
  )
}

const extractInnerXml = (envelope: unknown): string => {
  if (typeof envelope === 'object' && envelope !== null && 'string' in envelope) {
    const value = (envelope as { string: unknown }).string
    return typeof value === 'string' ? value : ''
  }
  throw new Error('La respuesta del BCCR no trae el nodo esperado')
}
```

`fast-xml-parser` desescapa las entidades al parsear, así que el XML interno sale ya utilizable; se vuelve a parsear y recién ahí se valida con Zod. Un registro suelto llega como objeto y varios como arreglo: el `union` cubre ambos casos, que es el error clásico con este servicio.

- [ ] **Paso 5: Configuración validada al arrancar**

`api/src/modules/money/infrastructure/bccr/bccr.config.ts`:

```ts
import { z } from 'zod'

const bccrConfigSchema = z.object({
  BCCR_ENDPOINT: z
    .string()
    .url()
    .default('https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx'),
  BCCR_EMAIL: z.string().email({ error: 'BCCR_EMAIL debe ser un correo válido' }),
  BCCR_TOKEN: z.string().min(1, { error: 'BCCR_TOKEN es obligatorio' }),
})

export interface BccrConfig {
  endpoint: string
  email: string
  token: string
}

export const loadBccrConfig = (source: NodeJS.ProcessEnv): BccrConfig => {
  const result = bccrConfigSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Credenciales del BCCR inválidas:\n${z.prettifyError(result.error)}`)
  }
  return {
    endpoint: result.data.BCCR_ENDPOINT,
    email: result.data.BCCR_EMAIL,
    token: result.data.BCCR_TOKEN,
  }
}
```

Agregar a `.env.example`:

```
BCCR_ENDPOINT="https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx"
BCCR_EMAIL="emiliorb@arclosystems.com"
BCCR_TOKEN=""
```

- [ ] **Paso 6: Cliente SOAP**

`api/src/modules/money/infrastructure/bccr/bccr-soap.client.ts`:

```ts
import type { DateRange } from '../../../../shared/kernel/date-range.js'
import type { RateIndicator } from '../../domain/exchange-rate.js'
import type { BccrConfig } from './bccr.config.js'

const SOAP_ACTION = 'https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/ObtenerIndicadoresEconomicos'

// El servicio espera dd/mm/aaaa. Una fecha en ISO no da error: da una respuesta vacía.
const toBccrDate = (date: Date): string => {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getUTCFullYear()}`
}

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (char) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char,
  )

export class BccrSoapClient {
  constructor(private readonly config: BccrConfig) {}

  async call(indicator: RateIndicator, range: DateRange): Promise<string> {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerIndicadoresEconomicos xmlns="https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/">
      <tcIndicador>${indicator}</tcIndicador>
      <tcFechaInicio>${toBccrDate(range.from)}</tcFechaInicio>
      <tcFechaFinal>${toBccrDate(range.to)}</tcFechaFinal>
      <tcNombre>finanzas</tcNombre>
      <tnSubNiveles>N</tnSubNiveles>
      <tcCorreoElectronico>${escapeXml(this.config.email)}</tcCorreoElectronico>
      <tcToken>${escapeXml(this.config.token)}</tcToken>
    </ObtenerIndicadoresEconomicos>
  </soap:Body>
</soap:Envelope>`

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8', soapaction: SOAP_ACTION },
      body,
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(`El BCCR respondió ${response.status} ${response.statusText}`)
    }

    return response.text()
  }
}
```

Si el Paso 1 mostró otros nombres de parámetro en el WSDL, ajustarlos acá. El resto del plan no cambia.

- [ ] **Paso 7: Adaptador y su test**

`api/src/modules/money/infrastructure/bccr/bccr-exchange-rate.adapter.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common'
import type { DateRange } from '../../../../shared/kernel/date-range.js'
import type { ExchangeRate } from '../../domain/exchange-rate.js'
import { RATE_INDICATORS } from '../../domain/exchange-rate.js'
import type { ExchangeRateProviderPort } from '../../domain/exchange-rate-provider.port.js'
import { BCCR_SOAP_CLIENT } from './bccr.tokens.js'
import type { BccrSoapClient } from './bccr-soap.client.js'
import { parseBccrResponse } from './bccr-response.schema.js'

@Injectable()
export class BccrExchangeRateAdapter implements ExchangeRateProviderPort {
  private readonly logger = new Logger(BccrExchangeRateAdapter.name)

  constructor(@Inject(BCCR_SOAP_CLIENT) private readonly client: BccrSoapClient) {}

  async fetchRates(range: DateRange): Promise<ExchangeRate[]> {
    const indicators = [RATE_INDICATORS.BUY, RATE_INDICATORS.SELL] as const
    const responses = await Promise.all(
      indicators.map(async (indicator) => {
        const xml = await this.client.call(indicator, range)
        const rates = parseBccrResponse(xml, indicator)
        this.logger.log(`BCCR ${indicator}: ${rates.length} publicaciones entre ${range.from.toISOString().slice(0, 10)} y ${range.to.toISOString().slice(0, 10)}`)
        return rates
      }),
    )
    return responses.flat()
  }
}
```

`api/src/modules/money/infrastructure/bccr/bccr.tokens.ts`:

```ts
export const BCCR_SOAP_CLIENT = Symbol('BCCR_SOAP_CLIENT')
```

`api/src/modules/money/infrastructure/bccr/bccr-exchange-rate.adapter.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { DateRange } from '../../../../shared/kernel/date-range.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import { BccrExchangeRateAdapter } from './bccr-exchange-rate.adapter.js'
import { BccrEmptyResponseError } from './bccr-response.schema.js'
import type { BccrSoapClient } from './bccr-soap.client.js'

const fixture = (name: string) =>
  readFileSync(new URL(`../../../../../test/fixtures/bccr/${name}`, import.meta.url), 'utf8')

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const range = unwrap(DateRange.create(utc('2026-09-16'), utc('2026-09-18')))

const clientStub = (xml: string): BccrSoapClient =>
  ({ call: vi.fn().mockResolvedValue(xml) }) as unknown as BccrSoapClient

describe('BccrExchangeRateAdapter', () => {
  it('pide compra y venta y devuelve las dos series', async () => {
    const client = clientStub(fixture('respuesta-valida.xml'))
    const rates = await new BccrExchangeRateAdapter(client).fetchRates(range)

    expect(client.call).toHaveBeenCalledTimes(2)
    expect(rates).toHaveLength(6)
  })

  it('propaga el error de respuesta vacía en lugar de devolver una lista vacía', async () => {
    const adapter = new BccrExchangeRateAdapter(clientStub(fixture('respuesta-vacia.xml')))
    await expect(adapter.fetchRates(range)).rejects.toBeInstanceOf(BccrEmptyResponseError)
  })
})
```

Que una credencial inválida termine en excepción y no en una lista vacía es el punto entero de esta tarea. Si el adaptador devolviera `[]`, el job de la Tarea 4 lo registraría como «hoy no publicaron» y el problema quedaría invisible.

- [ ] **Paso 8: Correr, verificar y commitear**

```bash
cd api && npm test -- bccr && npm run typecheck && npm run lint
git add api/src/modules/money api/test/fixtures
git commit -m "✨ feat: adaptador SOAP del BCCR con validación Zod de la respuesta"
```

**Acceptance criteria:**
- [ ] El contrato se confirmó contra el WSDL vivo antes de escribir el cliente
- [ ] Las fechas se envían en `dd/mm/aaaa`
- [ ] La respuesta vacía produce `BccrEmptyResponseError`, nunca una lista vacía
- [ ] Un registro único y varios registros se parsean igual de bien
- [ ] La fecha publicada no se corre de día por la zona horaria del proceso
- [ ] Un `NUM_VALOR` no numérico hace fallar el parseo

---

### Tarea 3: Persistencia de tasas y consulta por fecha vigente

**Descripción:** Guardar las tasas de forma idempotente y resolver «la tasa vigente en la fecha X». Índice único sobre `(indicator, publishedAt)` para que el backfill se pueda correr cien veces sin duplicar nada.

**Alcance:** S · **Dependencias:** Tarea 2

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/modules/money/infrastructure/prisma-exchange-rate.repository.ts`, `exchange-rate.mapper.ts`
- Test: `api/src/modules/money/infrastructure/prisma-exchange-rate.repository.spec.ts`

**Interfaces:**
- Consumes: `ExchangeRate`, `ExchangeRateRepository`, `PrismaService`, `DateRange`
- Produces: `class PrismaExchangeRateRepository implements ExchangeRateRepository`

- [ ] **Paso 1: Ampliar el esquema**

Agregar a `api/prisma/schema.prisma`:

```prisma
model ExchangeRate {
  id          String   @id @default(uuid(7))
  indicator   String   @db.Char(3)
  value       Decimal  @db.Decimal(14, 6)
  publishedAt DateTime @db.Date
  createdAt   DateTime @default(now()) @db.Timestamptz(3)

  @@unique([indicator, publishedAt])
  @@index([indicator, publishedAt(sort: Desc)])
  @@map("exchange_rates")
}
```

`Decimal(14,6)` da margen de sobra para el par CRC/USD. `publishedAt` es `@db.Date`: una publicación es un día. El índice único hace idempotente el backfill; el índice descendente sostiene la consulta de «la última publicación anterior o igual a X», que es la que se corre en cada conversión.

```bash
cd api && npx prisma migrate dev --name add_exchange_rates && npx prisma generate
```

- [ ] **Paso 2: Escribir el test que falla**

`api/src/modules/money/infrastructure/prisma-exchange-rate.repository.spec.ts`:

```ts
import { Decimal } from 'decimal.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../../test/postgres-container.js'
import { ExchangeRate } from '../domain/exchange-rate.js'
import { PrismaExchangeRateRepository } from './prisma-exchange-rate.repository.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const rate = (value: string, publishedAt: string, indicator: '317' | '318' = '317') =>
  unwrap(ExchangeRate.create({ indicator, value: new Decimal(value), publishedAt: utc(publishedAt) }))

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaExchangeRateRepository

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = new PrismaExchangeRateRepository(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.exchangeRate.deleteMany()
})

describe('PrismaExchangeRateRepository', () => {
  it('guarda varias tasas y conserva el decimal exacto', async () => {
    expect(await repository.saveMany([rate('508.190000', '2026-09-18')])).toBe(1)
    const found = await repository.findLatest('317')
    expect(found?.value.toString()).toBe('508.19')
  })

  it('el backfill es idempotente: guardar dos veces el mismo día no duplica', async () => {
    await repository.saveMany([rate('508.19', '2026-09-18')])
    await repository.saveMany([rate('508.19', '2026-09-18')])
    expect(await prisma.exchangeRate.count()).toBe(1)
  })

  it('una segunda carga del mismo día con otro valor corrige el existente', async () => {
    await repository.saveMany([rate('508.19', '2026-09-18')])
    await repository.saveMany([rate('509.00', '2026-09-18')])
    expect(await prisma.exchangeRate.count()).toBe(1)
    expect((await repository.findLatest('317'))?.value.toString()).toBe('509')
  })

  it('resuelve la tasa vigente un día sin publicación', async () => {
    // Viernes 18 publicado; sábado, domingo y un lunes feriado sin publicación.
    await repository.saveMany([rate('508.02', '2026-09-18')])

    for (const dia of ['2026-09-19', '2026-09-20', '2026-09-21']) {
      const vigente = await repository.findEffectiveAt('317', utc(dia))
      expect(vigente?.publishedAt.toISOString().slice(0, 10)).toBe('2026-09-18')
    }
  })

  it('devuelve null si se pregunta por una fecha anterior a toda publicación', async () => {
    await repository.saveMany([rate('508.02', '2026-09-18')])
    expect(await repository.findEffectiveAt('317', utc('2026-01-01'))).toBeNull()
  })

  it('no mezcla compra con venta', async () => {
    await repository.saveMany([rate('508.02', '2026-09-18', '317'), rate('515.30', '2026-09-18', '318')])
    expect((await repository.findLatest('317'))?.value.toString()).toBe('508.02')
    expect((await repository.findLatest('318'))?.value.toString()).toBe('515.3')
  })

  it('devuelve un rango ordenado por fecha', async () => {
    await repository.saveMany([
      rate('508.45', '2026-09-17'),
      rate('508.19', '2026-09-16'),
      rate('508.02', '2026-09-18'),
    ])
    const range = unwrap(DateRange.create(utc('2026-09-16'), utc('2026-09-17')))
    const found = await repository.findInRange('317', range)

    expect(found.map((r) => r.publishedAt.toISOString().slice(0, 10))).toEqual([
      '2026-09-16',
      '2026-09-17',
    ])
  })
})
```

El test del día sin publicación es el que el spec pide explícitamente. Cubre sábado, domingo y feriado con la misma aserción.

- [ ] **Paso 3: Correr y confirmar que falla**

```bash
cd api && npm test -- prisma-exchange-rate
```

- [ ] **Paso 4: Implementar el repositorio**

`api/src/modules/money/infrastructure/exchange-rate.mapper.ts`:

```ts
import { Decimal } from 'decimal.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { ExchangeRate, type RateIndicator } from '../domain/exchange-rate.js'

export interface ExchangeRateRow {
  indicator: string
  value: { toString(): string }
  publishedAt: Date
}

export const toDomain = (row: ExchangeRateRow): ExchangeRate =>
  unwrap(
    ExchangeRate.create({
      indicator: row.indicator as RateIndicator,
      value: new Decimal(row.value.toString()),
      publishedAt: row.publishedAt,
    }),
  )
```

`api/src/modules/money/infrastructure/prisma-exchange-rate.repository.ts`:

```ts
import { Injectable } from '@nestjs/common'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { ExchangeRate, RateIndicator } from '../domain/exchange-rate.js'
import type { ExchangeRateRepository } from '../domain/exchange-rate-repository.port.js'
import { toDomain, type ExchangeRateRow } from './exchange-rate.mapper.js'

@Injectable()
export class PrismaExchangeRateRepository implements ExchangeRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  // «Vigente en X» es la última publicación con fecha menor o igual a X.
  async findEffectiveAt(indicator: RateIndicator, date: Date): Promise<ExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: { indicator, publishedAt: { lte: date } },
      orderBy: { publishedAt: 'desc' },
    })
    return row ? toDomain(row as ExchangeRateRow) : null
  }

  async findLatest(indicator: RateIndicator): Promise<ExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: { indicator },
      orderBy: { publishedAt: 'desc' },
    })
    return row ? toDomain(row as ExchangeRateRow) : null
  }

  async findInRange(indicator: RateIndicator, range: DateRange): Promise<ExchangeRate[]> {
    const rows = await this.prisma.exchangeRate.findMany({
      where: { indicator, publishedAt: { gte: range.from, lte: range.to } },
      orderBy: { publishedAt: 'asc' },
    })
    return rows.map((row) => toDomain(row as ExchangeRateRow))
  }

  // El índice único sobre (indicator, publishedAt) es lo que hace idempotente al backfill.
  async saveMany(rates: readonly ExchangeRate[]): Promise<number> {
    const writes = rates.map((rate) =>
      this.prisma.exchangeRate.upsert({
        where: { indicator_publishedAt: { indicator: rate.indicator, publishedAt: rate.publishedAt } },
        create: {
          indicator: rate.indicator,
          publishedAt: rate.publishedAt,
          value: rate.value.toFixed(6),
        },
        update: { value: rate.value.toFixed(6) },
      }),
    )
    const results = await this.prisma.$transaction(writes)
    return results.length
  }
}
```

- [ ] **Paso 5: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: persistencia idempotente de tipos de cambio con consulta por fecha vigente"
```

**Acceptance criteria:**
- [ ] Guardar dos veces el mismo día no duplica filas
- [ ] Un sábado, un domingo y un feriado resuelven a la publicación del viernes anterior
- [ ] Una fecha anterior a toda publicación devuelve `null`, no la primera tasa
- [ ] Compra y venta no se mezclan

---

### Tarea 4: Job de sincronización y endpoints

**Descripción:** El job diario con backfill y tolerancia a fallos, y los dos endpoints del spec. La regla que gobierna todo: *ninguna operación se bloquea por la disponibilidad del banco central*. Si el BCCR no responde, se registra el fallo, la aplicación sigue con la última tasa conocida y la respuesta de la API dice que está desactualizada.

**Alcance:** M · **Dependencias:** Tarea 3

**Files:**
- Create: `api/src/modules/money/application/sync-exchange-rates.use-case.ts`, `get-latest-rates.use-case.ts`, `list-rates.use-case.ts`, `convert-money.use-case.ts`
- Create: `api/src/modules/money/infrastructure/exchange-rates-sync.job.ts`, `exchange-rates.controller.ts`, `exchange-rate.schemas.ts`
- Create: `api/src/modules/money/money.module.ts`
- Modify: `api/src/app.module.ts`
- Test: `api/src/modules/money/application/sync-exchange-rates.use-case.spec.ts`, `api/src/modules/money/infrastructure/exchange-rates.controller.spec.ts`

**Interfaces:**
- Produces:
  - `SyncExchangeRatesUseCase.execute(now?: Date): Promise<SyncReport>` con `SyncReport = { fetched: number; saved: number; from: Date; to: Date; failed: boolean; reason?: string }`
  - `GetLatestRatesUseCase.execute(now?: Date)` → `{ buy, sell, publishedAt, stale }`
  - `ListRatesUseCase.execute(indicator, range)`
  - `ConvertMoneyUseCase.execute(amount, to, at)`
  - `GET /api/v1/exchange-rates?indicator=&from=&to=`, `GET /api/v1/exchange-rates/latest`

- [ ] **Paso 1: Escribir el test del caso de uso que falla**

`api/src/modules/money/application/sync-exchange-rates.use-case.spec.ts`:

```ts
import { Decimal } from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { ExchangeRate } from '../domain/exchange-rate.js'
import type { ExchangeRateProviderPort } from '../domain/exchange-rate-provider.port.js'
import type { ExchangeRateRepository } from '../domain/exchange-rate-repository.port.js'
import { SyncExchangeRatesUseCase } from './sync-exchange-rates.use-case.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const HOY = utc('2026-09-18')

const rate = (publishedAt: string) =>
  unwrap(ExchangeRate.create({ indicator: '317', value: new Decimal('508'), publishedAt: utc(publishedAt) }))

const repositoryStub = (latest: ExchangeRate | null): ExchangeRateRepository => ({
  findEffectiveAt: vi.fn(),
  findLatest: vi.fn().mockResolvedValue(latest),
  findInRange: vi.fn(),
  saveMany: vi.fn().mockResolvedValue(3),
})

const providerStub = (rates: ExchangeRate[]): ExchangeRateProviderPort => ({
  fetchRates: vi.fn().mockResolvedValue(rates),
})

describe('SyncExchangeRatesUseCase', () => {
  it('pide solo el hueco entre la última tasa guardada y hoy, en una sola llamada', async () => {
    const provider = providerStub([rate('2026-09-16'), rate('2026-09-17'), rate('2026-09-18')])
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(rate('2026-09-15')))

    const report = await useCase.execute(HOY)

    expect(provider.fetchRates).toHaveBeenCalledTimes(1)
    expect(report.from.toISOString().slice(0, 10)).toBe('2026-09-16')
    expect(report.to.toISOString().slice(0, 10)).toBe('2026-09-18')
    expect(report.failed).toBe(false)
  })

  it('sin ninguna tasa guardada, arranca el backfill desde un año atrás', async () => {
    const provider = providerStub([rate('2026-09-18')])
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(null))

    const report = await useCase.execute(HOY)

    expect(report.from.toISOString().slice(0, 10)).toBe('2025-09-18')
  })

  it('no llama al BCCR si ya está al día', async () => {
    const provider = providerStub([])
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(rate('2026-09-18')))

    const report = await useCase.execute(HOY)

    expect(provider.fetchRates).not.toHaveBeenCalled()
    expect(report.saved).toBe(0)
  })

  it('si el BCCR falla, reporta el fallo y no lanza: la aplicación sigue andando', async () => {
    const provider: ExchangeRateProviderPort = {
      fetchRates: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
    }
    const useCase = new SyncExchangeRatesUseCase(provider, repositoryStub(rate('2026-09-15')))

    const report = await useCase.execute(HOY)

    expect(report.failed).toBe(true)
    expect(report.reason).toContain('ETIMEDOUT')
    expect(report.saved).toBe(0)
  })
})
```

- [ ] **Paso 2: Correr y confirmar que falla**

```bash
cd api && npm test -- sync-exchange-rates
```

- [ ] **Paso 3: Implementar la sincronización**

`api/src/modules/money/application/sync-exchange-rates.use-case.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { isErr } from '../../../shared/kernel/result.js'
import { RATE_INDICATORS } from '../domain/exchange-rate.js'
import {
  EXCHANGE_RATE_PROVIDER,
  type ExchangeRateProviderPort,
} from '../domain/exchange-rate-provider.port.js'
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepository,
} from '../domain/exchange-rate-repository.port.js'

export interface SyncReport {
  fetched: number
  saved: number
  from: Date
  to: Date
  failed: boolean
  reason?: string
}

const MS_PER_DAY = 86_400_000
const BACKFILL_DAYS = 365

const atUtcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

@Injectable()
export class SyncExchangeRatesUseCase {
  private readonly logger = new Logger(SyncExchangeRatesUseCase.name)

  constructor(
    @Inject(EXCHANGE_RATE_PROVIDER) private readonly provider: ExchangeRateProviderPort,
    @Inject(EXCHANGE_RATE_REPOSITORY) private readonly repository: ExchangeRateRepository,
  ) {}

  async execute(now = new Date()): Promise<SyncReport> {
    const today = atUtcMidnight(now)
    const latest = await this.repository.findLatest(RATE_INDICATORS.BUY)
    const from = latest
      ? new Date(latest.publishedAt.getTime() + MS_PER_DAY)
      : new Date(today.getTime() - BACKFILL_DAYS * MS_PER_DAY)

    if (from.getTime() > today.getTime()) {
      return { fetched: 0, saved: 0, from: today, to: today, failed: false }
    }

    const range = DateRange.create(from, today)
    if (isErr(range)) {
      return { fetched: 0, saved: 0, from, to: today, failed: true, reason: range.error.message }
    }

    try {
      // Un solo pedido cubre todo el hueco, sea de un día o de un año.
      const rates = await this.provider.fetchRates(range.value)
      const saved = await this.repository.saveMany(rates)
      return { fetched: rates.length, saved, from, to: today, failed: false }
    } catch (cause) {
      // La disponibilidad del banco central no puede tumbar la aplicación:
      // se registra, se reporta, y se sigue con la última tasa conocida.
      const reason = cause instanceof Error ? cause.message : String(cause)
      this.logger.error(`No se pudieron sincronizar los tipos de cambio: ${reason}`)
      return { fetched: 0, saved: 0, from, to: today, failed: true, reason }
    }
  }
}
```

- [ ] **Paso 4: El job**

```bash
cd api && npm install @nestjs/schedule@12.0.2
```

`api/src/modules/money/infrastructure/exchange-rates-sync.job.ts`:

```ts
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SyncExchangeRatesUseCase } from '../application/sync-exchange-rates.use-case.js'

@Injectable()
export class ExchangeRatesSyncJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExchangeRatesSyncJob.name)

  constructor(private readonly sync: SyncExchangeRatesUseCase) {}

  // Al arrancar se detecta el hueco entre la última tasa almacenada y hoy.
  async onApplicationBootstrap(): Promise<void> {
    await this.run('arranque')
  }

  @Cron('0 30 7 * * *', { name: 'sync-exchange-rates', timeZone: 'America/Costa_Rica', waitForCompletion: true })
  async daily(): Promise<void> {
    await this.run('diario')
  }

  private async run(origin: string): Promise<void> {
    const report = await this.sync.execute()
    if (report.failed) {
      this.logger.warn(`Sincronización ${origin} fallida: ${report.reason}`)
      return
    }
    this.logger.log(`Sincronización ${origin}: ${report.saved} tasas guardadas`)
  }
}
```

`waitForCompletion: true` evita que dos corridas se pisen si una se demora. La zona horaria es `America/Costa_Rica` porque el horario de publicación del BCCR es local, no UTC.

Registrar `ScheduleModule.forRoot()` **una sola vez**, en `app.module.ts`. Llamarlo en más de un módulo duplica los manejadores.

- [ ] **Paso 5: Endpoints**

`api/src/modules/money/infrastructure/exchange-rate.schemas.ts`:

```ts
import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })

export const listRatesQuerySchema = z
  .object({ indicator: z.enum(['317', '318']).default('317'), from: isoDate, to: isoDate })
  .meta({ title: 'ListRatesQuery' })

export const exchangeRateSchema = z
  .object({ indicator: z.enum(['317', '318']), value: z.string(), publishedAt: isoDate })
  .meta({ title: 'ExchangeRate' })

export const latestRatesSchema = z
  .object({
    buy: exchangeRateSchema.nullable(),
    sell: exchangeRateSchema.nullable(),
    stale: z.boolean(),
    checkedAt: z.string(),
  })
  .meta({ title: 'LatestExchangeRates' })

export type ListRatesQuery = z.infer<typeof listRatesQuerySchema>
export type LatestRates = z.infer<typeof latestRatesSchema>
```

`exchange-rates.controller.ts` expone `GET /exchange-rates` con el rango validado y `GET /exchange-rates/latest`. **`latest` va declarado antes de cualquier ruta con parámetro**, por la misma razón que `payoff-plan` en la rebanada 1.

`stale` es `true` cuando la última publicación tiene más de tres días. Tres, no uno: un viernes seguido de fin de semana y feriado da tres días sin publicación y eso es normal, no un problema.

Test del controlador, con Testcontainers y el mismo montaje que los de la rebanada 1:

```ts
describe('GET /api/v1/exchange-rates/latest', () => {
  it('marca la respuesta como desactualizada cuando la última publicación es vieja', async () => {
    await prisma.exchangeRate.create({
      data: { indicator: '317', value: '508.02', publishedAt: new Date('2020-01-02T00:00:00.000Z') },
    })

    const response = await request(app.getHttpServer()).get('/api/v1/exchange-rates/latest')

    expect(response.status).toBe(200)
    expect(response.body.stale).toBe(true)
    expect(response.body.buy.value).toBe('508.02')
  })

  it('responde 200 con valores nulos si nunca se sincronizó, no 500', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/exchange-rates/latest')

    expect(response.status).toBe(200)
    expect(response.body.buy).toBeNull()
    expect(response.body.stale).toBe(true)
  })

  it('rechaza con 400 un rango con fechas mal formadas', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/exchange-rates?from=18/09/2026&to=18/09/2026',
    )
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})
```

Que «nunca se sincronizó» devuelva 200 con nulos y no un 500 es parte de la misma regla: la ausencia de datos del banco central es un estado, no una falla del sistema.

- [ ] **Paso 6: Correr, verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
npm run start:dev
# en otra terminal
curl -s localhost:3000/api/v1/exchange-rates/latest
```

- [ ] **Paso 7: Commit**

```bash
git add api
git commit -m "✨ feat: sincronización diaria de tipos de cambio con backfill y tolerancia a fallos"
```

**Acceptance criteria:**
- [ ] El backfill pide el hueco completo en una sola llamada
- [ ] Sin tasas guardadas, arranca desde un año atrás
- [ ] Estando al día, no llama al BCCR
- [ ] Un fallo del BCCR se registra y se reporta, y la aplicación sigue respondiendo
- [ ] `latest` responde 200 con nulos cuando no hay datos, nunca 500
- [ ] `ScheduleModule.forRoot()` está declarado una sola vez

---

### Tarea 5: El tipo de cambio en la interfaz

**Descripción:** Mostrar la tasa vigente y, cuando corresponda, que está desactualizada. Un número que puede estar viejo y no lo dice es peor que no mostrar nada.

**Alcance:** S · **Dependencias:** Tarea 4, Tarea 10 del plan de la rebanada 1

**Files:**
- Create: `web/src/features/money/use-exchange-rates.ts`, `exchange-rate-indicator.tsx`, `copy.ts`
- Modify: `web/src/routes/__root.tsx`

- [ ] **Paso 1: Regenerar los tipos y escribir el copy**

```bash
cd web && npm run api:types
```

El copy del indicador y del estado desactualizado sale de la skill `copywriting` y vive en `web/src/features/money/copy.ts`. Hay que decir que el dato está viejo sin alarmar: no es un error del sistema, es que el banco central no ha publicado.

- [ ] **Paso 2: Hook y componente**

`use-exchange-rates.ts` expone `useLatestRates()` sobre `GET /exchange-rates/latest`, con `staleTime` de una hora: la tasa cambia una vez al día, consultarla más seguido es ruido.

`exchange-rate-indicator.tsx`:

- Muestra compra y venta con su fecha de publicación.
- Si `stale` es `true`, un `Badge` de shadcn con la variante de advertencia y el copy correspondiente. Nada de rojo de error: es información, no una falla.
- Si los dos valores son `null`, el estado vacío explica que todavía no se sincronizó, sin números inventados ni ceros.
- Cargando: `Skeleton` con la forma final, no un spinner.

Ubicación: en la cabecera, **no** como una tarjeta de métrica arriba de todo. La fila de tarjetas de métricas está prohibida por la regla F9.

- [ ] **Paso 3: Verificar**

```bash
cd web && npm test && npm run typecheck && npm run build
```

- [ ] Con la API respondiendo tasas frescas, el indicador muestra los dos valores y la fecha
- [ ] Con una tasa vieja en la base, aparece la marca de desactualizado
- [ ] Sin tasas, el estado vacío explica y no muestra ceros
- [ ] Con la API caída, un toast, y el resto de la aplicación sigue usable
- [ ] Contraste del `Badge` verificado en los dos temas
- [ ] Capturas a 360, 768 y 1440 px en los dos temas, revisadas
- [ ] `impeccable critique` y `audit` corridos sobre lo nuevo

- [ ] **Paso 4: Commit**

```bash
git add web
git commit -m "✨ feat: indicador de tipo de cambio con marca de desactualizado"
```

**Acceptance criteria:**
- [ ] La marca de desactualizado aparece cuando la publicación tiene más de tres días
- [ ] Sin datos, la interfaz lo dice en lugar de mostrar cero
- [ ] Una caída del BCCR no deja ninguna pantalla inutilizable

---

### Checkpoint: rebanada 2 completa

- [ ] `cd api && npm test` y `cd web && npm test` en verde
- [ ] El job corre al arrancar y llena la base sin duplicar
- [ ] Una consulta de tasa en un domingo devuelve la del viernes
- [ ] Apagar la red y arrancar la aplicación: arranca, registra el fallo y sigue sirviendo la última tasa
- [ ] Revisión con Emilio antes de la rebanada 3

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Los nombres de los parámetros SOAP difieren de los supuestos | Alto | Paso 1 de la Tarea 2: se leen del WSDL vivo antes de escribir el cliente |
| Una credencial mal configurada pasa por «sin datos» | Alto | La respuesta vacía lanza `BccrEmptyResponseError` y hay un test con el XML vacío grabado |
| La fecha se corre un día por el desplazamiento `-06:00` | Medio | El parser toma la parte de fecha como texto y hay un test específico |
| El BCCR cambia la forma del XML | Medio | Zod valida antes de usar, y los XML grabados hacen fallar los tests si algo cambia |
| Dos corridas del job se pisan | Bajo | `waitForCompletion: true` en el `@Cron` |

## Preguntas abiertas

- El token del BCCR requiere suscripción con correo. Si al llegar a la Tarea 2 todavía no está, se avanza con los XML grabados y se deja la verificación contra el servicio real como último paso de la rebanada.
