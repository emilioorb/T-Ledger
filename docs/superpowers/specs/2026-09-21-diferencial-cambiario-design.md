# Diferencial cambiario — diseño

**Fecha:** 2026-09-21
**Estado:** aprobado para implementar
**Responde a:** la pregunta abierta de `plans/2026-09-20-fase1-contabilidad.md:2664`

## 1. Objetivo

Responder **cuánto vale el patrimonio en una sola moneda**, y cuánto de ese número viene del
tipo de cambio y no de lo que Emilio hizo.

Hoy la contabilidad trata cada moneda como un libro separado —decisión 1 de la rebanada 3— y
con eso alcanza para registrar, cuadrar y cerrar. Lo que no puede hacer es sumar colones y
dólares. Ninguna pantalla lo intenta, y esa disciplina es correcta: sumarlos sin declarar a qué
tipo de cambio sería inventar un número.

Éxito es: un reporte de patrimonio a una fecha, en una moneda de presentación, que cuadre, que
diga con qué tasa se valuó, y que separe el efecto cambiario del resto.

## 2. Supuestos declarados

1. Las monedas del sistema son las dos que ya existen: CRC y USD. No hay una tercera.
2. La moneda funcional de Emilio es el colón: es en lo que piensa su patrimonio.
3. Los tipos de cambio del BCCR ya están sincronizados y consultables por fecha
   (`findEffectiveAt`), incluidos fines de semana y feriados, que devuelven la última publicada.
4. El volumen es personal: cientos de asientos por año, no millones.

## 3. Las tres decisiones

### Decisión 1: valuación de presentación, sin asientos de revaluación

La pregunta abierta sugería «una cuenta de resultados para el diferencial y un proceso de
revaluación». **No se hace así.**

Un asiento de revaluación en este modelo tendría que meter un monto en colones dentro de «Banco
dólares», y ahí se rompe lo que hace bueno al modelo: esa cuenta dejaría de decir cuántos
dólares hay. La alternativa estándar —llevar en cada línea del asiento el monto en moneda
funcional además del de transacción— es una migración de todos los asientos escritos y un
cambio en cada camino de escritura, para un número que se puede derivar.

Se deriva. El patrimonio consolidado es un **reporte**, no un asiento:

- No hay cuentas nuevas en el plan semilla.
- No hay proceso de revaluación ni asientos que reversar.
- Los cuatro reportes existentes no cambian: siguen siendo por moneda.
- El nuevo reporte no escribe nada.

El precedente está en la casa: el resultado del período también es una línea derivada y no un
asiento de cierre (`financial-position.ts:51`), y por eso el estado de situación cuadra sin
tener que cerrar el mes.

### Decisión 2: método de tasa de cierre, y una sola tasa

Todos los saldos —activos, pasivos y patrimonio— se traducen a la tasa vigente en la fecha del
reporte. Una sola tasa para todo.

Esto no es un atajo: es lo que hace que el reporte **cuadre por construcción**. Cada libro por
moneda ya cumple `activo = pasivo + patrimonio`; si cada saldo de ese libro se multiplica por el
mismo número, la identidad sobrevive. Sumar los dos libros traducidos da un estado que cuadra
sin línea de ajuste ni plug.

La tentación prudencial —activos a la compra y pasivos a la venta— rompe justamente eso y mete
un descuadre que hay que explicar con una línea de relleno. Se descarta.

**La tasa es la de compra (indicador 317).** La pregunta que el reporte responde es «si
convirtiera todo hoy, cuántos colones tendría», y por los dólares te pagan la compra. Es además
la valuación conservadora en una hoja donde los activos dominan.

### Decisión 3: el diferencial es contra la valuación histórica

El diferencial cambiario del reporte es:

```
diferencial = (activos − pasivos) a la tasa de cierre
            − (activos − pasivos) valuando cada movimiento a la tasa de su propio día
```

El segundo término es el costo histórico traducido: cada movimiento diario de cada cuenta
multiplicado por la tasa vigente **ese día**. La diferencia entre las dos valuaciones es, por
definición, lo que cambió por el tipo de cambio y no por lo que ocurrió.

Dos propiedades que lo hacen verificable:

- **El diferencial sobre el total de las cuentas es cero.** Cada asiento cuadra por moneda en su
  propia fecha, así que la valuación histórica también cuadra. Por eso el diferencial no se mide
  sobre todas las cuentas: se mide sobre la posición neta —activos menos pasivos— y su espejo
  exacto está en patrimonio y resultado.
- **Las cuentas en colones aportan cero**, porque su tasa es 1 todos los días. El diferencial es
  íntegramente de la posición en dólares, y el reporte lo muestra desglosado por moneda para que
  eso se vea y no haya que creerlo.

Esto además responde lo que el plan de la rebanada 3 dejó pendiente sobre la cuenta puente
`1190`: traducida, no netea a cero, y ese residuo es exactamente el resultado cambiario
**realizado** de las conversiones ya hechas. El de las demás cuentas en dólares es el **no
realizado**. Los dos son diferencial cambiario, y el reporte no necesita distinguirlos para ser
correcto.

## 4. Arquitectura

```
accounting/domain/
├── valuation-rate.port.ts        ← puerto: tasas de valuación por fecha
├── reports/net-worth.ts          ← constructor puro del reporte
accounting/application/
└── get-net-worth.use-case.ts     ← orquesta plan, diario y tasas
accounting/infrastructure/
└── bccr-valuation-rate.adapter.ts ← implementa el puerto sobre el módulo money
```

El puerto se llama por lo que contabilidad necesita, no por de dónde sale: `ValuationRateSource`
entrega **la tasa vigente en cada fecha pedida**, y quien la resuelva es problema de
infraestructura. Contabilidad no sabe qué es un indicador del BCCR. Es la misma costura que
`CategorizedSpending` le da a presupuesto.

```ts
export interface ValuationRateSource {
  // Una tasa por fecha pedida. Vigente en una fecha es la última publicada hasta esa fecha:
  // el BCCR no publica fines de semana ni feriados. Para la moneda funcional, siempre 1.
  ratesFor(dates: readonly Date[], currency: CurrencyCode): Promise<Map<string, Decimal>>
}
```

Devolver un mapa y no un objeto calendario deja la lógica de «última publicada hasta» en el
adaptador, con su propio test, y el dominio recibe datos.

El repositorio del diario suma una agregación:

```ts
// Por cuenta y por día, para poder valuar cada movimiento a la tasa de su propio día. La
// agregación es de la base: el reporte no trae asientos a memoria, igual que los otros cuatro.
totalsByAccountPerDay(currency: CurrencyCode, at: Date): Promise<DailyAccountTotals[]>
```

## 5. Contrato HTTP

Un recurso nuevo, no un parámetro del estado de situación. Un endpoint que devuelve una forma
distinta según un query param es lo que la guía de diseño de interfaces llama bandera roja, y
el estado de situación por moneda es un reporte distinto de este, no una variante.

```
GET /api/v1/reports/net-worth?at=2026-09-30&currency=CRC
```

```jsonc
{
  "at": "2026-09-30",
  "currency": "CRC",
  "rate": { "value": "443.27", "publishedAt": "2026-09-21" },
  "assets":      { "minorUnits": "...", "currency": "CRC" },
  "liabilities": { "minorUnits": "...", "currency": "CRC" },
  "equity":      { "minorUnits": "...", "currency": "CRC" },
  "netWorth":    { "minorUnits": "...", "currency": "CRC" },
  "exchangeDifference": { "minorUnits": "...", "currency": "CRC" },
  "balances": true,
  "byCurrency": [
    {
      "currency": "CRC",
      "netWorthNative":     { "minorUnits": "...", "currency": "CRC" },
      "netWorthTranslated": { "minorUnits": "...", "currency": "CRC" },
      "exchangeDifference": { "minorUnits": "0",   "currency": "CRC" }
    },
    { "currency": "USD", "...": "..." }
  ]
}
```

`balances` verifica `netWorth === equity`, que es la identidad después de traducir. Si diera
falso hay un error de implementación, y el reporte lo dice en vez de esconderlo.

**Sin tasa no hay reporte.** Si no existe ninguna publicación hasta la fecha pedida, responde
422 con el mensaje que nombra la fecha. Valuar a una tasa inventada o a la de otro día sin
decirlo sería exactamente el número que este reporte existe para no producir.

## 6. Pantalla

`/contabilidad/patrimonio`, bajo Contabilidad → Reportes, junto a los otros cuatro.

El héroe es el patrimonio en la moneda de presentación. Debajo, en el mismo bloque, la tasa
usada y su fecha de publicación: un número traducido sin su tasa no es verificable.

Después, dos cosas y nada más:

1. **De cuánto es el tipo de cambio.** El diferencial con su signo y una frase que lo explique
   sin jerga: «de tu patrimonio, ₡X viene del tipo de cambio y no de lo que hiciste».
2. **El desglose por moneda**: lo que hay en cada una en su propia moneda, y cuánto es eso
   traducido. Es la fila que hace verificable el total.

No lleva árbol de cuentas: para eso está el estado de situación, que ya lo hace por moneda y al
que esta pantalla enlaza. Repetirlo acá sería la novena tabla igual que la crítica de diseño ya
señaló.

## 7. Fuera de alcance

- Montos en moneda funcional en las líneas del asiento. No se migra nada.
- Asientos de revaluación, cuenta de diferencial en el plan, y su reverso.
- Diferencial en el estado de resultados: el resultado del período sigue siendo por moneda.
- Separar en el reporte el diferencial realizado del no realizado.
- Una tercera moneda, y elegir el indicador de valuación desde la interfaz.

## 8. Estrategia de prueba

| Nivel | Qué verifica |
|---|---|
| Unitario del dominio | El constructor del reporte con totales y tasas armados a mano: identidad, diferencial de una posición en dólares, diferencial cero cuando solo hay colones, y el caso de la cuenta puente traducida. |
| Unitario del adaptador | La tasa vigente un domingo es la del viernes; sin publicación previa, null; CRC siempre 1. |
| Integración del repositorio | `totalsByAccountPerDay` agrupa por cuenta y día y respeta la moneda, contra Postgres real en Testcontainers. |
| Punta a punta | Un asiento de conversión CRC→USD a una tasa y el reporte a una fecha con otra tasa: el diferencial es el esperado y `balances` es verdadero. 422 sin tasa. |

Comandos: `npm test` en `api/`, `npm run typecheck && npm test && npm run build` en `web/`.

## 9. Criterios de aceptación

1. `GET /reports/net-worth` responde patrimonio, diferencial y desglose por moneda, con la tasa
   y su fecha.
2. Con solo colones, el diferencial es exactamente cero.
3. Con una conversión CRC→USD registrada a 508 y el reporte a una fecha de tasa 443,27, el
   diferencial es el esperado a la unidad mínima.
4. `balances` es verdadero en todos los casos de prueba.
5. Sin ninguna tasa publicada hasta la fecha, responde 422 nombrando la fecha.
6. La pantalla muestra el patrimonio, la tasa usada, el diferencial y el desglose por moneda, y
   enlaza al estado de situación.
7. Los cuatro reportes existentes no cambian de forma ni de contrato.

## 10. Preguntas abiertas

Ninguna bloqueante. Si más adelante Emilio quiere el diferencial dentro de la contabilidad y no
derivado —para declararlo ante un tercero, por ejemplo—, la vía es la migración descartada en la
decisión 1, y este reporte queda como la vista de ese dato.
