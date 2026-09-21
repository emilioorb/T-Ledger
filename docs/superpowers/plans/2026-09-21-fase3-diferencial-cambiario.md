# Diferencial cambiario — plan de implementación

**Spec:** `docs/superpowers/specs/2026-09-21-diferencial-cambiario-design.md`

**Goal:** un reporte de patrimonio consolidado a una fecha, en moneda de presentación, que
cuadre y separe el efecto del tipo de cambio.

**Architecture:** valuación de presentación derivada, sin asientos ni cuentas nuevas. Lo que se
tiene se valúa a la tasa de compra del BCCR de hoy; lo que dicen los libros, a la tasa del día
en que ocurrió. La cuenta puente queda fuera, y para eso pasa a ser dato de la cuenta.

> Cambio durante la ejecución (21/09/2026): la Tarea 3 reveló que valuar los dos lados de la
> cuenta puente por separado deja en cero los dólares comprados, porque el lado en dólares
> cancela la tenencia. De ahí salió `isCurrencyBridge` y su migración, que el plan original no
> contemplaba. El spec quedó corregido.

## Global Constraints

- Ninguna moneda se suma a otra sin declarar la tasa y su fecha. Sin tasa, 422.
- Los cuatro reportes existentes no cambian de forma ni de contrato.
- No se escriben asientos: el reporte es de solo lectura.
- Zod 4 como única fuente del contrato; los tipos del front se regeneran, nunca se escriben.
- Dominio sin Nest, sin Prisma y sin HTTP. Agregaciones en la base, no en memoria.
- Copy en `copy.ts` del módulo, en español de Costa Rica, sin jerga contable sin explicar.

---

### Tarea 1: Agregación por cuenta y día

**Files:**
- Modify: `api/src/modules/accounting/domain/journal-repository.port.ts`
- Modify: `api/src/modules/accounting/infrastructure/prisma-journal.repository.ts`
- Test: `api/src/modules/accounting/infrastructure/prisma-journal.repository.spec.ts`

**Interfaces — Produces:**
```ts
export interface DailyAccountTotals {
  readonly accountCode: string
  readonly date: Date
  readonly debits: bigint
  readonly credits: bigint
}

totalsByAccountPerDay(currency: CurrencyCode, at: Date): Promise<DailyAccountTotals[]>
```

- [x] Paso 1: test de integración que asienta dos entradas en días distintos y una en otra
      moneda, y espera dos filas de la moneda pedida agrupadas por día
- [x] Paso 2: correrlo y verlo fallar
- [x] Paso 3: implementar con `groupBy` de Prisma sobre líneas unidas a su asiento
- [x] Paso 4: correrlo y verlo pasar
- [x] Paso 5: commit

**Verify:** `npm test -- prisma-journal.repository`

---

### Tarea 2: Puerto y adaptador de tasa de valuación

**Files:**
- Create: `api/src/modules/accounting/domain/valuation-rate.port.ts`
- Create: `api/src/modules/accounting/infrastructure/bccr-valuation-rate.adapter.ts`
- Test: `api/src/modules/accounting/infrastructure/bccr-valuation-rate.adapter.spec.ts`

**Interfaces — Produces:**
```ts
export interface ValuationRateSource {
  ratesFor(dates: readonly Date[], currency: CurrencyCode): Promise<Map<string, Decimal>>
}
export const VALUATION_RATE_SOURCE = Symbol('VALUATION_RATE_SOURCE')
```

- [x] Paso 1: tests con un repositorio de tasas falso — CRC devuelve 1 para toda fecha; USD un
      domingo devuelve la del viernes; sin publicación previa, la fecha no aparece en el mapa
- [x] Paso 2: correrlos y verlos fallar
- [x] Paso 3: implementar con una consulta por fecha distinta, deduplicando fechas repetidas
- [x] Paso 4: correrlos y verlos pasar
- [x] Paso 5: commit

**Verify:** `npm test -- bccr-valuation-rate`

---

### Tarea 3: Constructor del reporte

**Files:**
- Create: `api/src/modules/accounting/domain/reports/net-worth.ts`
- Test: `api/src/modules/accounting/domain/reports/net-worth.spec.ts`

**Interfaces — Consumes:** `AccountMovementTotals`, `DailyAccountTotals`, `ChartOfAccounts`.

**Produces:**
```ts
export interface CurrencyBreakdown {
  readonly currency: CurrencyCode
  readonly netWorthNative: Money
  readonly netWorthTranslated: Money
  readonly exchangeDifference: Money
}

export interface NetWorth {
  readonly assets: Money
  readonly liabilities: Money
  readonly equity: Money
  readonly netWorth: Money
  readonly exchangeDifference: Money
  readonly balances: boolean
  readonly byCurrency: CurrencyBreakdown[]
}

export const buildNetWorth = (input: NetWorthInput) => NetWorth
```

- [x] Paso 1: tests — solo colones da diferencial cero; una posición en dólares comprada a 508
      y valuada a 443,27 da el diferencial esperado; la identidad `netWorth === equity` se
      cumple en los dos; la cuenta puente traducida deja el residuo esperado
- [x] Paso 2: correrlos y verlos fallar
- [x] Paso 3: implementar: traducir saldos de cierre, traducir movimientos diarios a su tasa,
      restar sobre la posición neta
- [x] Paso 4: correrlos y verlos pasar
- [x] Paso 5: commit

**Verify:** `npm test -- net-worth`

---

### Tarea 4: Caso de uso y endpoint

**Files:**
- Create: `api/src/modules/accounting/application/get-net-worth.use-case.ts`
- Modify: `accounting.schemas.ts`, `accounting.presenters.ts`, `accounting.openapi.ts`,
  `reports.controller.ts`, `accounting.module.ts`
- Test: `api/src/modules/accounting/infrastructure/accounting.e2e.spec.ts`

- [x] Paso 1: casos e2e — una conversión CRC→USD y el reporte a otra fecha; 422 sin tasa
- [x] Paso 2: correrlos y verlos fallar
- [x] Paso 3: implementar caso de uso, esquema Zod, presentador y ruta `GET /reports/net-worth`
- [x] Paso 4: correrlos y verlos pasar
- [x] Paso 5: `npm run build && npm run lint && npm test`; commit

**Verify:** `npm test -- accounting.e2e`

---

### Tarea 5: Pantalla de patrimonio

**Files:**
- Create: `web/src/routes/contabilidad.patrimonio.tsx`
- Modify: `web/src/features/accounting/copy.ts`, `use-accounting.ts`, `types.ts`,
  `web/src/components/app-sidebar.tsx`, `page-breadcrumb.tsx`, `web/src/lib/query-keys.ts`

- [x] Paso 1: `npm run api:types` para traer el tipo generado
- [x] Paso 2: copy nuevo en `copy.ts`, sin jerga sin explicar
- [x] Paso 3: pantalla con héroe, tasa usada, diferencial y desglose por moneda; los cinco
      estados: carga, error con reintento, vacío, con datos y sin tasa
- [x] Paso 4: entrada en el nav bajo Reportes y etiqueta en la miga
- [x] Paso 5: `npm run typecheck && npm test && npm run build`
- [x] Paso 6: verificación en el navegador a 1440 y 390, con datos reales
- [x] Paso 7: commit

**Verify:** el reporte en pantalla cuadra contra el estado de situación de cada moneda

---

### Tarea 6: Cerrar la pregunta abierta

**Files:**
- Modify: `docs/superpowers/plans/2026-09-20-fase1-contabilidad.md`

- [x] Paso 1: reemplazar la pregunta abierta por la resolución y el enlace a este plan
- [x] Paso 2: commit

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El diferencial se mide sobre todas las cuentas y da cero siempre | Alto | Test explícito: se mide sobre activos menos pasivos, y hay un caso con dólares donde es distinto de cero |
| Valuar con una tasa por defecto cuando no hay publicación | Alto | 422 con la fecha en el mensaje, y caso e2e |
| El signo del diferencial queda invertido | Medio | El test de la posición en dólares fija el signo: si la tasa baja, el diferencial es negativo |
| `totalsByAccountPerDay` mezcla monedas | Medio | Test de integración con dos monedas |
| La pantalla repite el árbol del estado de situación | Medio | Criterio de rechazo en la Tarea 5: sin árbol de cuentas, con enlace al reporte que sí lo tiene |
