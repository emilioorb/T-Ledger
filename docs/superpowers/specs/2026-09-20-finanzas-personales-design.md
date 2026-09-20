# Diseño — Sistema de finanzas personales

Fecha: 2026-09-20
Estado: aprobado para planificación

## 1. Propósito

Un sistema de planificación financiera personal construido desde cero. No es la traducción de
ninguna herramienta anterior: el modelo de datos, las pantallas y los cálculos salen de las
preguntas que el sistema tiene que responder, no de cómo estaban acomodadas antes.

Las preguntas que define como obligatorias:

- ¿En qué mes queda libre cada cuota?
- ¿Cuánto interés se ahorra abonando un monto extra a una deuda?
- ¿Cómo se ve el mes contra el modelo de presupuesto activo?
- ¿Se llega a una meta en la fecha deseada con el aporte actual?
- ¿Cuánto rinde una inversión a una fecha dada y cuándo vuelve el capital?
- ¿Cuánto entra por los préstamos otorgados y cuándo terminan de cobrarse?

Usuario único (Emilio). Sin registro público, sin multi-tenant, sin cumplimiento regulatorio.
Sin importación de datos previos: la carga inicial es manual y deliberada.

## 2. Alcance por fases

**Fase 1**
Deudas con amortización, préstamos otorgados, tipos de cambio del BCCR, contabilidad de partida
doble, presupuesto, metas, inversiones y proyección de flujo de caja.

**Fase 2**
Conciliación bancaria e importación de movimientos desde archivos del banco. Nada de eso es
necesario para que la fase 1 sirva.

`budget` consume una interfaz `CategorizedSpending`, que resuelve un proveedor que agrega los
asientos del período por cuenta. Esa costura existe para poder cambiar la fuente del gasto sin
tocar el dominio de presupuesto, no porque en fase 1 haya estimados: el gasto sale de asientos
reales desde el día uno.

## 3. Stack

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL en Docker Compose |
| Backend | NestJS + Prisma |
| Frontend | Vite + React + TypeScript |
| Rutas y datos | TanStack Router (rutas por archivo) + TanStack Query |
| UI | shadcn/ui + Tailwind + Recharts |
| Contratos | Esquemas Zod en la API + cliente TypeScript generado desde OpenAPI |

TanStack Start queda descartado: sigue en alpha. Next.js queda descartado porque con NestJS como
servidor su capa de servidor no aporta — la app es privada, sin SEO ni renderizado público.

El monorepo queda descartado. La documentación de NestJS reserva el modo monorepo para equipos y
entornos multiproyecto, y deja el modo estándar como opción por defecto para una aplicación con sus
propias dependencias que no necesita compartir módulos. Acá hay un desarrollador y una aplicación.
La misma documentación señala que se puede pasar de estándar a monorepo en cualquier momento, así
que la decisión se pospone sin costo.

## 4. Arquitectura

Hexagonal con granularidad variable: capa de dominio rica donde hay reglas financieras reales,
módulo delgado donde solo hay CRUD. Aplicar Clean Architecture de forma uniforme sobre CRUD es
el pitfall de sobreingeniería, no una virtud.

### Contextos

| Módulo | Responsabilidad | Profundidad |
|---|---|---|
| `shared/kernel` | `Money`, `Currency`, `Percentage`, `InterestRate`, `DateRange`, `Result` | Dominio puro |
| `money` | Tipos de cambio, conversión, integración BCCR | Dominio rico |
| `debts` | Deudas y préstamos otorgados, amortización, abonos extra, estrategias de pago | Dominio rico |
| `investments` | Inversiones, capitalización, valor proyectado, vencimiento | Dominio medio |
| `budget` | Ingresos, categorías, modelos de presupuesto, evaluación | Dominio rico |
| `goals` | Metas, aportes, fecha proyectada | Dominio medio |
| `accounting` | Plan de cuentas, asientos de partida doble, mayor, comprobación y estados | Dominio rico |
| `projection` | Orquestación de proyección de flujo de caja | Sin persistencia propia |

### Estructura

Dos proyectos independientes en el mismo repositorio, cada uno con su `package.json` y sus
dependencias. Sin workspaces, sin paquetes enlazados.

```
finanzas/
├── docker-compose.yml
├── api/
│   ├── package.json
│   ├── prisma/
│   └── src/
│       ├── shared/kernel/
│       └── modules/
│           ├── money/          domain/ application/ infrastructure/
│           ├── debts/          domain/ application/ infrastructure/
│           ├── budget/         domain/ application/ infrastructure/
│           ├── goals/          domain/ application/ infrastructure/
│           ├── investments/   domain/ application/ infrastructure/
│           ├── accounting/     domain/ application/ infrastructure/
│           └── projection/     application/ infrastructure/
└── web/
    ├── package.json
    └── src/
```

### Reglas de dependencia

1. Las dependencias apuntan hacia `domain/`. `domain/` no importa Nest, Prisma ni HTTP.
2. Ningún módulo importa el `domain/` de otro. Se comunican por casos de uso o eventos de dominio.
3. `projection` es el único que coordina varios módulos, y lo hace a través de sus puertos.
4. Los puertos se inyectan con tokens de Nest (`{ provide: DEBT_REPOSITORY, useClass: ... }`).
5. Los repositorios nunca devuelven tipos generados por Prisma hacia las capas superiores.

Eventos de dominio (`ExtraPaymentApplied`, `GoalReached`, `ExchangeRatesSynced`) resueltos en
proceso con el emisor de eventos de Nest. Sin CQRS, sin buses, sin event sourcing.

## 5. Modelo de dominio

### shared/kernel

`Money` es inmutable y guarda un `bigint` en la unidad mínima más el código ISO de moneda.
Operaciones: `add`, `subtract`, `multiply`, `allocate`, `compareTo`. Toda operación entre monedas
distintas falla explícitamente; la conversión es un paso separado y deliberado.

`allocate(ratios)` reparte un monto entre porcentajes distribuyendo el residuo en lugar de
redondear cada parte, de modo que la suma de las partes siempre iguala el total.

`InterestRate` guarda tasa anual y convención de capitalización, y expone la tasa periódica.
`Percentage` valida el rango 0–100. `Result<T, E>` representa errores de dominio esperables;
las excepciones quedan para lo excepcional.

### debts

`Debt` es raíz de agregado:

- `principal: Money`, `rate: InterestRate` (0% es válido), `termMonths`, `startDate`
- `kind: FRENCH | FIXED_PRINCIPAL | INTEREST_FREE`
- `direction: BORROWED | LENT` — si Emilio debe la plata o se la deben
- `counterparty`: quién es la otra parte (CONAPE, los papás, un amigo)
- `budgetBucket`: a qué cubeta del presupuesto pertenece su cuota (decisión por deuda)
- `schedule(): AmortizationSchedule` — función pura, sin E/S
- `applyExtraPayment(payment): DebtProjection` — compara el escenario con y sin abono

Un préstamo otorgado es el mismo agregado con `direction: LENT`. La matemática es idéntica —
mismo capital, misma tasa, misma tabla de amortización — y lo único que cambia es el signo: su
cuota entra como ingreso en la proyección de flujo y no consume ninguna cubeta del presupuesto.
Modelarlo como un módulo aparte duplicaría la amortización entera para invertir un signo.

Las estrategias de pago solo ordenan deudas con `direction: BORROWED`: un préstamo que Emilio
otorgó no compite por el excedente mensual, lo alimenta.

`AmortizationSchedule` produce las cuotas con desglose capital/interés y saldo. El último pago
absorbe el residuo de redondeo para que el saldo final sea exactamente cero.

`PayoffStrategy` es una interfaz con implementaciones `AvalancheStrategy` (mayor tasa primero),
`SnowballStrategy` (menor saldo primero) y `ManualOrderStrategy`. Ordena a qué deuda dirigir el
excedente mensual disponible.

### budget

```
interface BudgetModel {
  readonly id: string
  readonly buckets: BudgetBucket[]
  evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation
}
```

`PercentageBudgetModel` cubre 50/30/20, 70/20/10 y cualquier reparto propio: las cubetas y sus
porcentajes son datos, no código. 50/30/20 es una instancia semilla, no una clase.
Validación: los porcentajes de un modelo deben sumar 100.

`BudgetEvaluation` reporta, por cubeta, el monto asignado, el consumido y la desviación.

Asignación de las cuotas de deuda: **configurable por deuda** vía `Debt.budgetBucket`. Los abonos
extraordinarios se asignan siempre a la cubeta de ahorro/patrimonio, independientemente de la
cubeta de la deuda, porque construyen patrimonio en lugar de sostener el mes.

### goals

`Goal` con monto objetivo (`Money`), fecha deseada, aportes registrados y prioridad. Deriva el
aporte mensual requerido para llegar a la fecha deseada y la fecha proyectada real según el ritmo
de aporte observado. Emite `GoalReached` al alcanzarse.

### accounting

**Plan de cuentas.** `Account` tiene `code` numérico único, `name`, `parentCode`, `active`,
`sortOrder` y `class`, con seis clases: `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`,
`COST_OF_REVENUE`, `OPERATING_EXPENSE`. Cada clase tiene su saldo normal: deudor las de activo,
costo y gasto; acreedor las de pasivo, patrimonio e ingreso. El saldo que se reporta ya viene con
el signo de su saldo normal, de modo que un activo con más créditos que débitos se muestra
negativo.

Las cuentas **no tienen moneda**. La moneda vive en la línea del asiento y todo reporte se acota
a una sola moneda. Es lo que permite que una conversión se registre como dos tramos contra una
cuenta puente de traslados entre monedas: el tramo en colones cuadra en colones y el de dólares
cuadra en dólares.

Solo se asienta contra cuentas hoja. Una cuenta agrupadora acumula el saldo de sus hijas y
rechaza cualquier asiento directo. Una cuenta inactiva tampoco acepta asientos, pero conserva su
historial.

**Asientos.** `JournalEntry` es raíz de agregado: fecha, descripción, referencia opcional y dos
líneas como mínimo. Cada `JournalLine` lleva cuenta, moneda, monto y lado (débito o crédito).

La invariante: **por cada moneda presente en el asiento, la suma de débitos iguala la suma de
créditos**. No es el total lo que cuadra, es cada moneda por separado. Un asiento que no cumple
esto se rechaza; no existe el asiento descuadrado guardado como borrador.

**Reportes.** Los cuatro salen de los asientos, ninguno se almacena:

- *Mayor*: los movimientos de una cuenta en una moneda, con saldo inicial y saldo corrido.
- *Comprobación*: por cuenta con movimiento en el período, débitos, créditos y saldo, más la
  diferencia entre totales siempre a la vista.
- *Estado de situación*: el árbol de activos, pasivos y patrimonio con saldos acumulados.
- *Estado de resultados*: ingresos menos costo de ingresos menos gastos operativos del período.

`Activo = Pasivo + Patrimonio` se cumple exacto porque el patrimonio del estado de situación
incluye el **resultado del período como línea derivada**, además de los saldos de las cuentas de
patrimonio. Sin esa línea, la identidad solo cuadraría después de asientos de cierre, y el cierre
de período queda para la fase 2.

**Categorías.** `Category` tiene nombre, `kind: EXPENSE | INCOME`, `accountCode` opcional,
orden y estado activa. Es el puente entre el lenguaje de Emilio y el plan de cuentas: él piensa
en «Tecnología y software», el sistema asienta contra la cuenta mapeada. Una categoría sin cuenta
es válida, y sus movimientos se registran pero **no se contabilizan**; la interfaz lo dice en vez
de fallar.

**Movimientos.** `Movement` es la puerta de entrada real: fecha, `kind: EXPENSE | INCOME`,
categoría, contraparte (proveedor o fuente), monto en su moneda, comprobante opcional, cuenta de
pago o cobro, y `status: ACTIVE | VOIDED`.

Emilio no carga asientos. Carga movimientos, y **el asiento es consecuencia**: un gasto debita la
cuenta de la categoría y acredita la cuenta de pago; un ingreso hace lo inverso. Si la categoría
no tiene cuenta mapeada, el movimiento queda sin asiento y se reporta como no contabilizado.

Un movimiento **no se borra, se anula**. Anular genera el asiento de reversión y marca el
movimiento como `VOIDED`; el original y su reversión quedan los dos en el mayor. Borrar un
movimiento ya asentado destruiría la trazabilidad, que es la única razón por la que existe la
contabilidad.

El asiento manual sigue existiendo para lo que no es un gasto o ingreso simple: conversiones
entre monedas contra la cuenta puente de traslados, préstamos, ajustes.

**Cierre mensual.** `AccountingPeriod` es un mes con estado abierto o cerrado. Cerrar un mes es
**bloquearlo**, no correr asientos: un período cerrado rechaza todo asiento cuya fecha caiga
dentro de él, y también la anulación de un movimiento de ese mes.

Tres reglas:

1. **Los meses se cierran en orden.** No se puede cerrar septiembre con agosto abierto.
2. **Cerrar tiene precondiciones**: ningún movimiento del mes sin asiento, y la comprobación del
   período cuadrando. La lista de bloqueos es extensible, y cada bloqueo se reporta con su razón
   en texto para que la pantalla diga qué falta en lugar de solo negarse.
3. **Un mes cerrado se puede reabrir**, y reabrir uno obliga a reabrir los posteriores cerrados.

El cierre no genera asientos y no toca resultados acumulados: el resultado del período se sigue
derivando en el estado de situación. Bloquear el período da lo que el cierre contable busca —que
lo registrado deje de moverse— sin la ceremonia de los asientos de cierre.

Deudas, metas e inversiones llevan un `accountCode` opcional: desde qué cuenta se paga, hacia
cuál se aporta, en cuál vive el capital.

### investments

`Investment` es raíz de agregado: capital colocado (`Money`), `InterestRate`, fecha de apertura,
`kind: FIXED_TERM | OPEN` y, cuando es a plazo, fecha de vencimiento. Registra aportes
adicionales con su fecha.

Deriva el valor proyectado a una fecha por interés compuesto sobre la convención de
capitalización de su tasa, el interés ganado a la fecha y, para las de plazo fijo, el mes en que
el capital vuelve a estar disponible. No tiene tabla de amortización: una inversión capitaliza,
no amortiza. Emite `InvestmentMatured` al vencer.

Fuera de alcance dentro de inversiones: valuación a precio de mercado, portafolio con
instrumentos cotizados, rendimiento ajustado por riesgo. Acá una inversión es un capital
colocado a una tasa conocida, no una posición que fluctúa.

### projection

`CashFlowProjection` recibe ingreso mensual estimado, las cuotas del mes de cada deuda, las
cuotas que Emilio cobra por los préstamos que otorgó, los vencimientos de inversiones, los
aportes a metas y el gasto estimado, y proyecta N meses. Reporta por mes: ingreso, egreso
comprometido, excedente disponible y qué cuotas se liberan. El valor no está en el total, sino en
saber en qué mes cambia cada cosa.

## 6. Tipos de cambio (BCCR)

Puerto: `ExchangeRateProviderPort.fetchRates(range: DateRange): Promise<ExchangeRate[]>`.

Adaptador `BccrExchangeRateAdapter`:

- Endpoint SOAP: `https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx`
- Método `ObtenerIndicadoresEconomicos`; indicador **317 = compra**, **318 = venta**
- Parámetros obligatorios: `Indicador`, `FechaInicio`, `FechaFinal`, `Nombre`, `SubNiveles`,
  `CorreoElectronico`, `Token`
- Credenciales en variables de entorno, validadas al arrancar la aplicación

La respuesta XML se parsea y se valida con Zod antes de usarse. Es obligatorio: el servicio
devuelve vacío en lugar de error cuando falta un parámetro, así que una credencial mal
configurada se manifestaría como "sin datos" y no como fallo. La validación convierte ese caso
silencioso en un error explícito y registrado.

### Job de sincronización

`@Cron` de `@nestjs/schedule` con `timeZone: 'America/Costa_Rica'`, ejecución matutina diaria.

1. **Días sin publicación.** El BCCR no publica fines de semana ni feriados. Se guarda la fecha
   de publicación y la consulta "tasa vigente en la fecha X" resuelve a la última publicación
   con fecha menor o igual a X.
2. **Backfill.** Al arrancar se detecta el hueco entre la última tasa almacenada y hoy, y se pide
   el rango completo en una sola llamada.
3. **Tolerancia a fallos.** Si el BCCR no responde, se registra el fallo y la aplicación continúa
   con la última tasa conocida, marcada como desactualizada en la respuesta de la API. Ninguna
   operación se bloquea por la disponibilidad del banco central.

Las tasas siempre se persisten. La conversión nunca golpea la red.

## 7. Persistencia

| Dato | Tipo Prisma | Razón |
|---|---|---|
| Montos | `BigInt` (unidad mínima) + `String` ISO 4217 | `Int` es int32 y se desborda: ₡56.349.293 son 5.634.929.300 céntimos |
| Tasas de interés | `Decimal @db.Decimal(9,6)` | Exactitud decimal |
| Tipos de cambio | `Decimal @db.Decimal(14,6)` | Exactitud decimal con margen para CRC/USD |
| Fecha de publicación | `DateTime @db.Date` | Una publicación del BCCR es un día, no un instante |
| Marcas de tiempo | `timestamptz` | Instantes reales |

Nunca `Float` para valores monetarios ni para tasas.

Índice único sobre `(indicator, publishedAt)` en tipos de cambio para que el backfill sea
idempotente.

## 8. API

Base `/api/v1`. Sustantivos en plural, sin verbos en la URL. `PATCH` para actualización parcial.
Paginación en toda lista (`page`, `pageSize`, con `pagination` en la respuesta).

Formato único de error en todos los endpoints:

```
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { } } }
```

Mapeo: 400 entrada inválida · 404 no encontrado · 409 conflicto · 422 validación semántica ·
500 error interno sin detalles internos expuestos.

Recursos:

- `GET|POST /debts`, `GET|PATCH|DELETE /debts/:id`
- `GET /debts/:id/schedule` — tabla de amortización
- `POST /debts/:id/simulate` — simulación de abono extraordinario
- `GET /debts/payoff-plan?strategy=avalanche|snowball|manual`
- `GET|POST /budget-models`, `GET|PATCH /budget-models/:id`
- `GET /budget/evaluation?month=YYYY-MM`
- `GET|POST /goals`, `GET|PATCH|DELETE /goals/:id`, `POST /goals/:id/contributions`
- `GET|POST /accounts`, `GET|PATCH /accounts/:code`
- `GET /accounts/tree?currency=&at=` — plan de cuentas con saldos acumulados
- `GET|POST /categories`, `GET|PATCH|DELETE /categories/:id`
- `GET|POST /movements`, `GET|PATCH /movements/:id`, `POST /movements/:id/void`
- `GET|POST /journal-entries`, `GET /journal-entries/:id` — asiento manual, sin borrado
- `GET /reports/ledger?account=&currency=&from=&to=` — mayor
- `GET /reports/trial-balance?currency=&from=&to=` — comprobación
- `GET /reports/financial-position?currency=&at=` — estado de situación
- `GET /reports/income-statement?currency=&from=&to=` — estado de resultados
- `GET /periods` — estado de cada mes y qué le falta para cerrarse
- `POST /periods/:period/close`, `POST /periods/:period/reopen`
- `GET|POST /investments`, `GET|PATCH|DELETE /investments/:id`, `POST /investments/:id/contributions`
- `GET /investments/:id/projection?at=YYYY-MM-DD` — valor proyectado e interés ganado
- `GET /exchange-rates?from=&to=`, `GET /exchange-rates/latest`
- `GET /projections?months=N`
- `GET|POST /transactions` (fase 2)

Los esquemas Zod de entrada y salida viven en la API y son la única definición del contrato. La
API publica su OpenAPI y el frontend deriva de ahí sus tipos con un generador. El frontend nunca
declara a mano la forma de una respuesta: la copia existe, pero la produce un script, no una
persona. Cada schema expuesto lleva un `title` explícito para que los tipos generados salgan con
nombre y no como objetos anónimos.

La validación ocurre solo en los bordes: controladores HTTP, respuesta del BCCR y carga de
variables de entorno. Entre funciones internas se confía en los tipos.

## 9. Frontend

TanStack Router con rutas por archivo y el `queryClient` en el contexto del router.
`defaultPreloadStaleTime: 0` para que TanStack Query gobierne el caché en lugar del router.

Pantallas: panel general; movimientos con alta, edición y anulación; categorías con su cuenta
contable; plan de cuentas como árbol con saldo por moneda y estado activa o inactiva; asiento
manual; mayor; comprobación con exportación a CSV; estado de situación;
estado de resultados; deudas separadas en lo que Emilio debe y lo que le deben, con detalle,
tabla de amortización y simulador de abono; inversiones con valor proyectado; presupuesto
(evaluación del mes contra el modelo activo, editor de modelos); metas; proyección de flujo de
caja; y cierre mensual con el estado de cada mes y qué le falta para cerrarse.

Las simulaciones se calculan en el backend y se consumen por endpoint. No se duplica la lógica
financiera en el cliente: una sola fuente de verdad para los números.

## 10. Pruebas

Núcleo de dominio con tests unitarios puros, sin Docker ni contenedor de Nest. Casos obligatorios:

- `Money.allocate` cuadra exactamente en repartos no divisibles
- Amortización francesa contra una tabla calculada a mano
- Deuda con tasa 0% (caso de la deuda a los padres)
- Último pago absorbiendo el residuo, saldo final exactamente cero
- Consulta de tasa en una fecha sin publicación del BCCR
- Modelo de presupuesto cuyos porcentajes no suman 100 es rechazado
- Préstamo otorgado: su cuota suma al ingreso proyectado y no consume cubeta de presupuesto
- Estrategia de pago que ignora los préstamos otorgados
- Valor proyectado de una inversión contra un cálculo de interés compuesto hecho a mano
- Asiento cuyos débitos y créditos no cuadran en alguna moneda es rechazado
- Asiento multimoneda que cuadra por moneda pero no en total es aceptado
- Asiento contra una cuenta agrupadora o inactiva es rechazado
- Saldo de una cuenta con el signo de su saldo normal, probado en las seis clases
- Comprobación de un período cuyos totales coinciden, y de uno donde la diferencia se ve
- Estado de situación que cuadra con el resultado del período incluido en patrimonio
- Movimiento de gasto que genera su asiento con la cuenta de su categoría
- Movimiento de categoría sin cuenta que se guarda y queda marcado como no contabilizado
- Anulación que genera la reversión y deja las dos partidas en el mayor
- Asiento con fecha dentro de un período cerrado es rechazado
- Cerrar un mes con el anterior abierto es rechazado, con la razón en texto
- Cerrar un mes con movimientos sin asiento es rechazado, con el conteo en la razón
- Reabrir un mes obliga a reabrir los posteriores cerrados

Repositorios contra PostgreSQL real vía Testcontainers. Adaptador del BCCR contra respuestas XML
grabadas, incluyendo el caso de respuesta vacía por credencial inválida.

## 11. Fuera de alcance

Multiusuario, autenticación de terceros, sincronización bancaria automática, aplicación móvil
nativa, portafolio de instrumentos cotizados con valuación a mercado, declaración de impuestos.

Dentro de contabilidad quedan fuera: asientos de cierre que lleven ingresos y gastos a
resultados acumulados, conciliación bancaria, importación de movimientos desde archivos del
banco, y reexpresión por inflación.
