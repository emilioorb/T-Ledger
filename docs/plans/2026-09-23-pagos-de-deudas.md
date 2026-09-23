# Spec: pagos reales de las deudas

## Objetivo

Hoy una deuda da por pagada toda cuota cuya fecha pasó (`Debt.balanceAt`, por calendario). No
sabe si pagaste de verdad, y la tabla de amortización no distingue una cuota pagada de una
futura. Se quiere:

1. **Ver en la tabla qué cuotas están pagadas, cuáles atrasadas y cuál sigue.**
2. **Registrar el pago real de cada cuota**, que a la vez anota el movimiento en la
   contabilidad, para que la deuda y el libro digan lo mismo.

Quien lo usa: cualquier persona con una deuda propia (`BORROWED`) en su libro. Caso de hoy: la
cuota de CONAPE de agosto, pagada antes de empezar el libro.

## Comportamiento

- **Estado de cada cuota**: `PAGADA` si tiene un pago registrado; `ATRASADA` si su fecha pasó y
  no lo tiene; `PENDIENTE` si su fecha no llegó. La primera no pagada se marca como la que sigue.
- **Registrar pago** (desde el detalle de la deuda): paga la siguiente cuota sin pagar, siempre
  en orden. Pide fecha, cuenta de donde salió la plata y categoría (sugerida: la de la cubeta de
  la deuda, «Préstamos» en el libro de hoy). El monto es el de la cuota.
  - Crea el movimiento de gasto con esos datos y el pago de la cuota, **en una sola
    transacción** y con su rastro, igual que un aporte a una meta.
- **Marcar como pagada sin movimiento**: para cuotas pagadas antes de llevar el libro. Solo
  registra el pago, no toca la contabilidad.
- **Deshacer el último pago**: borra el pago y anula su movimiento, si tiene.
- **El saldo pendiente sale de los pagos**, no del calendario: saldo después de la última cuota
  pagada. Una cuota atrasada no baja el saldo. Esto cambia lo que muestran el tablero, el plan de
  pago y la proyección, que hoy asumen que pagás en fecha.
- **Las deudas `LENT`** (plata que te deben) quedan como están: fuera de alcance.

## Transición de los datos existentes

Las deudas creadas antes de esto no tienen pagos, así que con la regla nueva volverían a su
capital original. La migración **marca como pagadas sin movimiento las cuotas ya vencidas** de
cada deuda existente: preserva el saldo que se veía ayer, y quien tenga una atrasada la desmarca.

Lo mismo al **crear** una deuda con fecha de inicio pasada: quien carga un préstamo que ya viene
pagando no tiene cómo registrar las cuotas de antes con su movimiento. Las vencidas a la fecha de
creación quedan pagadas sin movimiento; las siguientes se registran de verdad.

## Fuera de alcance

- Pagos parciales o por un monto distinto de la cuota.
- Abonos extraordinarios reales (hoy existe solo la simulación).
- Que anular un movimiento desde la pantalla de Movimientos deshaga el pago de la deuda. Se
  anula desde la deuda; desde Movimientos queda para una fase siguiente.

## Stack y comandos

API NestJS 12 + Prisma 7 + Postgres 18; web React 19 + TanStack Router/Query.

- API: `cd api && npx vitest run`, `npx tsc --noEmit`, `npx eslint src`
- Migración: `cd api && npx prisma migrate dev --name pagos_de_deudas`
- Tipos del front: `cd web && npm run api:types`
- Web: `cd web && npx vitest run`, `npx tsc -b --noEmit`

## Estructura

- Dominio: `api/src/modules/debts/domain/` — el estado de cada cuota y el saldo por pagos.
- Caso de uso: `api/src/modules/debts/application/registrar-pago.use-case.ts`, siguiendo
  `goals/application/manage-goals.use-case.ts#addContribution`.
- Persistencia: tabla `debt_payments` (deuda, número de cuota, fecha, monto, movimiento opcional).
- Web: `web/src/routes/deudas.$debtId.index.tsx` y `web/src/features/debts/amortization-table.tsx`.

## Pruebas

- Dominio (unitarias): estado de cada cuota, saldo por pagos, orden obligatorio.
- Caso de uso (integración con Postgres): pago + movimiento en la misma transacción; si el
  movimiento falla (período cerrado, cuenta inválida), no queda el pago.
- Migración: una deuda existente conserva su saldo.
- Web: la tabla muestra los tres estados.

## Límites

- Siempre: test que falle antes del código, commits por tarea, rastro en toda escritura de plata.
- Preguntar antes: cambiar cómo se calcula el saldo de las deudas `LENT`.
- Nunca: registrar un pago sin su movimiento cuando se eligió cuenta, ni dejar el saldo
  calculado por calendario en un lugar y por pagos en otro.

## Criterios de éxito

- En el detalle de CONAPE la cuota 1 aparece pagada y la 2 como la que sigue.
- Registrar el pago de la cuota 2 crea el movimiento de ₡152.900 en la cuenta elegida, baja el
  saldo y marca la cuota pagada.
- Una cuota vencida sin pago aparece atrasada y el saldo no baja.
- Tablero, plan de pago y proyección usan el mismo saldo que el detalle.
