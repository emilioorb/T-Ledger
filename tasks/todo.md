# Tareas: 6b, dos personas escribiendo a la vez

Plan: [`plan.md`](plan.md). Cada tarea: TDD con el test de dos escritores primero (Prove-It), `check:task` al terminar,
un commit por tarea. Rutas relativas a `api/src/` salvo que diga `web/`.

## Fase 0: cimientos

- [x] **1. Transacción serializable con reintento.** `withTransaction` abre Serializable y reintenta hasta 3 veces ante
  `P2034`; agotado, lanza un error propio.
  - Acepta: dos transacciones que chocan terminan una aplicada y otra reintentada; un test prueba que el adapter
    traduce 40001 y 40P01 (también en el `COMMIT`); una transacción anidada no reintenta por su cuenta.
  - Archivos: `shared/prisma/prisma.service.ts`, `shared/prisma/unit-of-work.port.ts`, spec nuevo. (S)
- [ ] **2. Errores de la base con respuesta propia.** `EDITADO_POR_OTRO` (409), `REINTENTAR` (409), `P2002` a 409 y `P2025`
  a 404, en vez de 500.
  - Acepta: cada caso tiene su código en la respuesta; ninguno va a Sentry como error; el mensaje de
    `EDITADO_POR_OTRO` dice «esto cambió mientras lo editabas», sin culpar a nadie.
  - Archivos: `shared/http/api-error.ts`, `shared/http/all-exceptions.filter.ts`, su spec. (S)
- [ ] **3. Migración.** `version Int @default(0)` en las 12 entidades e índice único parcial
  `bank_lines("movementId") WHERE status = 'MATCHED'`.
  - Acepta: la migración corre sobre una copia con datos y no corta nada; el índice rechaza dos líneas conciliadas al
    mismo movimiento; la guarda `clasificacion-de-modelos` sigue verde.
  - Archivos: `prisma/schema.prisma`, migración nueva, `shared/prisma/clasificacion-de-modelos.spec.ts`. (S)
- [ ] **4. Escritura condicionada y dos libros en paralelo.** Ayudante `escribirConVersion` (update/delete con
  `{ id, version }`, 404 o 409 según corresponda, sin versión escribe y cuenta). Test de carga: dos libros escribiendo
  en paralelo, cero falsos conflictos.
  - Acepta: el ayudante distingue los tres casos; el test de dos libros pasa 20 veces seguidas sin `REINTENTAR`.
  - Archivos: `shared/prisma/escribir-con-version.ts`, su spec, spec de dos libros. (S)

### Checkpoint A
- [ ] Suite completa verde, `check:task` limpio. Si el test de dos libros mostró falsos conflictos, parar y revisar.

## Fase 1: movimientos (lo que más se usa)

- [ ] **5. Movimiento con versión en el dominio y el repositorio.** El movimiento lleva su `version`; `save` crea o
  actualiza condicionado.
  - Acepta: guardar con versión vieja da 409; el mapper y el presenter exponen `version`.
  - Archivos: `accounting/domain/movement.ts`, `accounting.mappers.ts`, `prisma-movement.repository.ts`, presenter,
    spec del repo. (M)
- [ ] **6. Editar y anular movimientos.** Reglas adentro (mes abierto, anulado), `version` opcional en el contrato.
  - Acepta: dos ediciones a la vez, una gana y la otra recibe 409; dos anulaciones a la vez dejan **un** asiento
    inverso; editar en un mes que se cierra en paralelo no deja asientos adentro.
  - Archivos: `update-movement.use-case.ts`, `void-movement.use-case.ts`, `accounting.schemas.ts`,
    `movements.controller.ts`, `update-movement.e2e.spec.ts`. (M)
- [ ] **7. Comprobante de un movimiento.** Adjuntar o quitar va adentro y con versión; un movimiento anulado no revive.
  - Acepta: anular y adjuntar a la vez no vuelve el movimiento a activo; subir a R2 queda fuera de la transacción.
  - Archivos: `manage-comprobante.use-case.ts`, `movements.controller.ts`, spec. (S)

### Checkpoint B
- [ ] Tests de accounting verdes. Revisión con Emilio del primer módulo completo antes de repetir el patrón.

## Fase 2: deudas y pagos

- [ ] **8. Pagos que no se reescriben.** `save` de la deuda deja de borrar y recrear pagos; la deuda lleva versión.
  - Acepta: editar el nombre mientras otro paga no borra el pago.
  - Archivos: `debts/domain/debt.ts`, `debt.mapper.ts`, `prisma-debt.repository.ts`, `debt-repository.port.ts`, spec
    del repo. (M)
- [ ] **9. Pagar y deshacer.** Reglas adentro; deshacer manda la cuota que espera.
  - Acepta: dos pagos a la vez de la misma cuota registran uno y no dejan gasto huérfano; dos «Deshacer» sobre la cuota 5
    deshacen una.
  - Archivos: `pagos-de-deuda.use-case.ts`, `debt.schemas.ts`, `debts.controller.ts`, `debts-pagos.controller.spec.ts`. (M)
- [ ] **10. Editar, borrar y documento de una deuda** con versión y reglas adentro.
  - Archivos: `update-debt.use-case.ts`, `delete-debt.use-case.ts`, `documento-de-deuda.use-case.ts`,
    `debts.controller.spec.ts`. (M)

## Fase 3: banco y conciliación

- [ ] **11. Conciliar, desconciliar e ignorar.** En transacción, `markX` condicionado por estado, índice único.
  - Acepta: dos conciliaciones del mismo movimiento con dos líneas: una gana, la otra 409; dos conciliaciones de la misma
    línea: una.
  - Archivos: `match-line.use-case.ts`, `prisma-bank-statement.repository.ts`, `bank-statement` port,
    `reconciliation.controller.spec.ts`. (M)
- [ ] **12. Línea a movimiento, cuentas bancarias y perfiles.** Reglas adentro; dos «convertir» generan un movimiento.
  - Archivos: `line-to-movement.use-case.ts`, `manage-bank-accounts.use-case.ts`, `manage-import-profiles.use-case.ts`,
    sus repos, spec. (M)

### Checkpoint C
- [ ] Suite completa verde, `check:task` limpio.

## Fase 4: cierre de mes

- [ ] **13. Cerrar y reabrir.** Bloqueos y meses cerrados posteriores calculados adentro; el repo usa la transacción del
  caso de uso.
  - Acepta: cerrar un mes mientras entra un movimiento en él: o entra antes del cierre o recibe «mes cerrado», nunca
    queda adentro de un mes cerrado.
  - Archivos: `close-period.use-case.ts`, `reopen-period.use-case.ts`, `prisma-period.repository.ts`, spec nuevo. (M)

## Fase 5: metas e inversiones

- [ ] **14. Metas.** Versión, aporte y pausa adentro, `GOAL_REACHED` calculado adentro (uno solo).
  - Archivos: `goals/domain/goal.ts`, `prisma-goal.repository.ts`, `manage-goals.use-case.ts`, `goals.schemas.ts`,
    `goals.controller.spec.ts`. (M)
- [ ] **15. Inversiones.** El mismo patrón.
  - Archivos: `investments/domain/investment.ts`, `prisma-investment.repository.ts`, `manage-investments.use-case.ts`,
    `investments.schemas.ts`, spec. (M)

## Fase 6: presupuesto y catálogos

- [ ] **16. Modelos de presupuesto.** Versión; activar uno sube la versión de los que apaga; cubetas diferenciadas.
  - Archivos: `prisma-budget-model.repository.ts`, `manage-budget-models.use-case.ts`, `budget.schemas.ts`,
    `budget.controller.spec.ts`. (M)
- [ ] **17. Ingreso mensual con caso de uso propio** (hoy lo escribe el controller directo), con versión y rastro.
  - Archivos: caso de uso nuevo, `budget.controller.ts`, `prisma-budget-income.repository.ts`, spec. (S)
- [ ] **18. Categorías y cuentas.** Versión y transacción.
  - Archivos: `manage-categories.use-case.ts`, `save-account.use-case.ts`, sus repos, spec nuevo. (M)

### Checkpoint D
- [ ] Suite completa verde; `check:full` limpio; la API publicable sola (acepta pedidos sin `version`).

## Fase 7: web

- [ ] **19. Cliente.** Cada pedido manda la versión del cliente en una cabecera; los errores se distinguen por `code`
  (`EDITADO_POR_OTRO`, `REINTENTAR`, mes cerrado), ya no por el 409 a secas.
  - Archivos: `web/src/lib/api.ts`, `web/src/lib/api-types.gen.ts`, `web/src/features/debts/use-debts.ts`, spec. (S)
- [ ] **20. Formularios y acciones.** Mandan la `version` que vieron; ante `EDITADO_POR_OTRO`, el aviso ofrece «Cargar lo
  último» (según la respuesta a la pregunta abierta). Se reparte por pantalla en sub-tareas de ≤5 archivos al llegar acá.
- [ ] **21. Medir, documentar y publicar.** Contador de pedidos sin `version` (log y Sentry), novedades, ADR si algo se
  aparta de la spec, `/ship`, deploy de la API antes que la web.

### Checkpoint final
- [ ] Todos los criterios de la spec cumplidos; `check:full` limpio; revisado con `/ship`.
