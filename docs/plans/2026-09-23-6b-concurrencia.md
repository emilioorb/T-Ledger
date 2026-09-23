# Spec: 6b, dos personas escribiendo a la vez

## Objetivo

Un libro compartido tiene más de una persona editándolo. Hoy **gana el último que escribe, en
silencio**: los casos de uso leen la entidad fuera de la transacción, mezclan lo que mandó el
formulario y guardan con un `upsert` que pisa lo que haya. En una contabilidad compartida ese
es el peor resultado posible (spec de la fase 6, §11): la plata que anotó una persona
desaparece sin que nadie se entere.

Se quiere que **nada se pise en silencio**: si algo cambió mientras lo editabas, la app te lo
dice en vez de guardar encima; y que las operaciones que escriben varias filas a la vez (el
movimiento y su asiento, el pago y su gasto) no queden a medias ni se crucen.

Para quién: las personas que comparten un libro (fase 6a). Con una sola persona no cambia
nada visible.

## Lo que muestra el código hoy (relevado el 2026-09-23)

- Ningún modelo tiene `version`. Las ediciones van por `save()` → `upsert` por id.
- Las reglas (mes abierto, anulado, conciliado, pagos de deuda, bloqueos para cerrar) se
  chequean antes de la transacción: dos personas anulando el mismo movimiento a la vez pasan
  las dos el chequeo y generan **dos** asientos inversos.
- Cada `debt.save` reescribe todos los `DebtPayment` con la lista que leyó: editar el nombre
  de una deuda mientras otro paga una cuota puede borrar ese pago.
- Conciliar una línea bancaria no usa transacción, y nada en la base impide que dos líneas
  concilien con el mismo movimiento.
- `withTransaction` (`api/src/shared/prisma/prisma.service.ts:62`) usa Read Committed y no
  reintenta. Los errores de Prisma (`P2034`, `P2002`, `P2025`) terminan en 500.
- El 409 existe (`ConflictError`, code `CONFLICT`) y la web muestra el mensaje en un toast;
  `use-debts.ts` lee cualquier 409 como «mes cerrado». Ningún test pone dos escritores a la vez.

## Criterios de éxito

1. **Editar o borrar algo que cambió devuelve 409** con un código propio (`EDITADO_POR_OTRO`),
   en vez de pisarlo; si ya no existe, 404. Vale para todas las entidades que se editan.
2. **Las transiciones de estado no se duplican**: dos anulaciones, dos conciliaciones, dos pagos
   o dos «deshacer» simultáneos del mismo objeto terminan en uno solo.
3. **Las escrituras de varias filas son atómicas y serializables**: con dos escritores a la
   vez, cada libro queda como si hubieran ido una detrás de la otra. Un choque de la base
   (`P2034`) se reintenta solo, hasta 3 veces, y recién después se informa con un código
   distinto (`REINTENTAR`). Un mes que se cierra al mismo tiempo que se anota un movimiento en
   él no queda con asientos adentro.
4. **En la web**, el 409 de edición dice, sin tecnicismos y sin culpar a nadie, que eso cambió
   mientras lo editabas, y ofrece cargar lo último. Lo escrito no se pierde sin avisar.
5. **Sin cortar a nadie durante el deploy**: la API acepta pedidos sin `version` mientras haya
   clientes viejos (la PWA se actualiza cuando la persona toca «Actualizar»), y se mide cuántos
   quedan antes de volverlo obligatorio.
6. Tests de integración con **dos escritores reales en paralelo** (Testcontainers) para cada
   mecanismo, y uno con **dos libros** en paralelo que no se estorben. Sin regresiones: los 700
   tests de la API y los del front en verde, `check:full` limpio.

## Cómo

Revisado con doubt-driven-development (revisor adversarial con contexto nuevo, 2026-09-23). La
causa de fondo que encontró: agregar versión y Serializable no protege nada si **las lecturas de
las que dependen las reglas se hacen fuera de la transacción**, que es como está hoy. La
conciliación de sus hallazgos está al final.

1. **Las reglas se leen adentro.** Todo chequeo del que depende una escritura (mes abierto,
   movimiento anulado, línea conciliada, pagos de la deuda, bloqueos para cerrar, meses
   cerrados después) se hace dentro del mismo `withTransaction` que escribe. Sin esto,
   Serializable no ve el conflicto: Postgres solo detecta lo que las dos transacciones leen y
   escriben adentro.
2. **Transacciones serializables con reintento acotado.** `withTransaction` abre con
   `isolationLevel: Serializable` y reintenta ante `P2034` hasta 3 veces. Reintentar es seguro
   solo porque, por el punto 1, la función vuelve a leer todo adentro, y porque toda escritura
   de una edición lleva su condición (punto 3): un reintento con datos viejos falla en vez de
   pisar. Agotados los reintentos: 409 `REINTENTAR` («no se pudo guardar por un cruce
   momentáneo, probá de nuevo»), no el de edición. Se verifica con un test que
   `@prisma/adapter-pg` traduce 40001 y 40P01 a `P2034`, también en el `COMMIT`; si no, se
   traduce a mano.
   https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions (Transaction timing issues)
3. **Control optimista con versión.** Columna `version Int @default(0)` en cada entidad
   editable. Editar es `updateMany` con `where: { id, version }` y `version: { increment: 1 }`;
   borrar, `deleteMany` con la misma condición. Si `count === 0`, se distingue: si la fila ya
   no existe, 404; si existe con otra versión, 409 `EDITADO_POR_OTRO`. Toda escritura lateral
   sobre una fila versionada (apagar los otros modelos de presupuesto, registrar un documento)
   también sube la versión.
   https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions (Optimistic concurrency control)
4. **Lo que no sale de un formulario también manda lo que espera.** Pagar una cuota, deshacer
   el último pago, adjuntar o quitar un documento, anular, conciliar: el cliente manda la
   `version` que vio, o el número de cuota que quiere deshacer. Dos «Deshacer» sobre la cuota 5
   deshacen una sola.
5. **Una regla entre filas va en la base.** «Un movimiento concilia con una sola línea» pasa a
   un índice único parcial sobre `bank_lines("movementId") WHERE status = 'MATCHED'`, y
   conciliar va en transacción. Los choques de unicidad (`P2002`) y de fila ausente (`P2025`)
   se traducen a 409 y 404 en vez de 500.
6. **Pagos de deuda.** Dejan de reescribirse en cada `debt.save`: solo cambian en los casos de
   uso de pagos, protegidos por la versión de la deuda.
7. **Expand/contract del contrato** (caso 8). Primero la API acepta `version` opcional y lo
   declara en los esquemas Zod (hoy un campo desconocido se descarta en silencio), y se publica
   antes que la web. La web manda `version` y una cabecera con su versión de cliente. Volverlo
   obligatorio se decide **midiendo** cuántos pedidos llegan sin `version` (log y Sentry), no
   por calendario.
8. **El mensaje no culpa a nadie.** El 409 de edición dice que «esto cambió mientras lo
   editabas», no «otra persona»: también pasa con dos pestañas propias.

### Entidades con versión

Movement, Debt, Goal, Investment, Category, Account, AccountingPeriod, BudgetModel,
BudgetIncome, ImportProfile, BankAccount, BankLine. Quedan afuera las que solo se agregan
(JournalEntry, contribuciones, AuditLog), ExchangeRate (upsert idempotente de la
sincronización) y las tablas de Better Auth.

## Supuestos

1. Postgres de Railway soporta Serializable sin configuración extra. Se verifica en un test de
   integración, junto con la traducción a `P2034`.
2. **Riesgo a medir, no a suponer:** Serializable usa bloqueos de predicado por página, o por
   tabla cuando el plan es un escaneo secuencial, y puede hacer chocar transacciones de libros
   distintos. Un test pone dos libros escribiendo en paralelo y cuenta falsos conflictos; si
   aparecen, se revisan índices y planes antes de seguir.
3. La columna nueva es aditiva con default: la migración no corta el servicio. Rollback: el
   código viejo ignora la columna.
4. Better Auth (libros, miembros, invitaciones) queda fuera.

## Tareas (se detallan con `planning-and-task-breakdown` al aprobar)

1. `withTransaction` serializable con reintento, `REINTENTAR` al agotarse, traducción de
   `P2002`/`P2025`/`P2034`. Tests: dos transacciones que chocan, y dos libros en paralelo sin
   falsos conflictos.
2. Migración: `version` en las 12 entidades, e índice único parcial de conciliación.
3. Movimientos: reglas adentro (mes abierto, anulado), edición y anulación con versión,
   `version` opcional en el contrato. Test de dos escritores.
4. Deudas y pagos: reglas adentro, versión, pagos que no se reescriben, deshacer con la cuota
   esperada.
5. Banco y conciliación: transacción, condición de estado, índice único.
6. Cierres y reaperturas de mes: los bloqueos se calculan adentro.
7. Metas, inversiones, presupuesto, catálogos: el mismo patrón, por módulo (incluido
   `GOAL_REACHED` calculado adentro).
8. Web: mandar `version` y la cabecera de cliente, distinguir `EDITADO_POR_OTRO` de `REINTENTAR`
   por `code`, y el aviso con «Cargar lo último».
9. Medir clientes sin `version`; novedades; ADR si algo se aparta de la spec §11.

## Límites

- Siempre: TDD con dos escritores reales; `check:task` por tarea y `check:full` antes del push.
- Preguntar antes: volver `version` obligatorio (la parte contract); tocar Better Auth.
- Nunca: resolver un conflicto «fusionando» en silencio, ni reintentar una edición del usuario
  con su versión vieja (eso es volver a pisar).

## Preguntas abiertas

- **Qué pasa con el formulario ante un 409.** Propuesta: queda abierto con lo que escribiste,
  y el aviso ofrece «Cargar lo último», que trae la versión nueva y te deja decidir. La
  alternativa (cerrar y recargar) es más simple pero te hace perder lo escrito.

## Conciliación de la revisión adversarial (2026-09-23)

| # | Hallazgo | Clase | Resolución |
|---|---|---|---|
| B1 | Las reglas se leen fuera de la transacción: Serializable no ve el conflicto | Accionable | Punto 1 |
| B2 | Reintentar re-ejecuta con datos leídos afuera (línea bancaria → dos movimientos) | Accionable | Puntos 1 y 2: se reintenta solo con todo leído adentro y escrituras condicionadas |
| B3 | Conciliar no usa transacción; la regla es entre filas | Accionable | Punto 5: índice único parcial y transacción |
| S1 | La fase expand no se mide; Zod descarta `version` en silencio | Accionable | Punto 7 |
| S2 | Escrituras sin formulario no tienen versión que mandar | Accionable | Punto 4 |
| S3 | Borrar no lleva versión; no se distingue 404 de versión vieja | Accionable | Punto 3 |
| S4 | 409 de edición en altas y jobs al agotar reintentos | Accionable | Código `REINTENTAR` |
| S5 | Falsos conflictos entre libros por bloqueos de predicado | Riesgo a medir | Supuesto 2 y test de dos libros |
| S6 | Clientes viejos leen todo 409 como «mes cerrado» | Compromiso | Tarea 8 para los nuevos; los viejos, hasta que actualicen |
| S7 | `P2002`/`P2025` terminan en 500 | Accionable | Punto 5 |
| S8 | Escrituras laterales no suben la versión | Accionable | Punto 3 |
| S9 | No está verificado que el adapter traduzca a `P2034` | Accionable | Punto 2, con test |
| M1 | Anular es idempotente (200) y el criterio pedía 409 | Accionable | Anular algo ya anulado sigue en 200; la condición es la versión |
| M2 | El mensaje culpa a «otra persona» | Accionable | Punto 8 |
| M3 | `GOAL_REACHED` doble o ninguno | Accionable | Tarea 7 |
| M4 | Reabrir lee meses cerrados afuera | Accionable | Tarea 6 |
| — | Consulta cruda sin `bookId`: el patrimonio sumaba todos los libros | **Bug en producción, fuera de 6b** | Arreglado aparte (`eb4eed7`), con test y guarda |
