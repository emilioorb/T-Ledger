# Plan de implementación: 6b, dos personas escribiendo a la vez

Spec aprobada: [`docs/plans/2026-09-23-6b-concurrencia.md`](../docs/plans/2026-09-23-6b-concurrencia.md).
Relevamiento del código: 2026-09-24 (12 entidades, unos 90 archivos). Tareas en [`todo.md`](todo.md).

## Resumen

Que nada se pise en silencio. Cada entidad que se edita lleva `version`; guardar con una versión
vieja da 409 `EDITADO_POR_OTRO`. Las reglas se leen dentro de una transacción serializable que
reintenta sola ante un choque, y responde `REINTENTAR` si no alcanza. Lo que no sale de un
formulario (anular, conciliar, pagar, deshacer) manda lo que espera. Se va módulo por módulo,
cada uno con su test de dos escritores reales en paralelo.

## Decisiones de arquitectura

- **La versión viaja en el cuerpo**, no en `If-Match`. Es lo que pide la spec (punto 7) y deja
  los controllers casi como están. Es opcional mientras haya clientes viejos (expand).
- **Un solo ayudante para la escritura condicionada** (`escribirConVersion`). Hace el
  `updateMany`/`deleteMany` con `{ id, version }`, y si no tocó nada distingue 404 de 409.
  Todos los repositorios lo usan. Sin versión (cliente viejo) escribe como hoy y lo cuenta.
- **Los hijos no se reescriben.** Los pagos de una deuda y las cubetas de un modelo dejan de
  borrarse y recrearse en cada `save`: los pagos solo cambian en sus casos de uso, y las
  cubetas se diferencian.
- **La transacción la abre el caso de uso**, no el repositorio. Los cuatro repositorios que
  abren la suya pasan a usar la del caso de uso, para que las lecturas de la regla queden
  adentro.
- **Serializable en todas las escrituras de negocio**, con 3 reintentos ante `P2034`. Antes de
  seguir se mide (tarea 1) que el adapter traduce 40001 y 40P01, y (tarea 4) que dos libros en
  paralelo no chocan.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Falsos conflictos entre libros por bloqueos de predicado de Serializable | Alto: errores sin motivo con varios usuarios | Test de dos libros en paralelo en la tarea 4, antes de tocar un módulo. Si aparecen, índices por `bookId` o `SELECT … FOR UPDATE` en vez de Serializable |
| `@prisma/adapter-pg` no traduce 40001 a `P2034` | Medio: los choques quedan en 500 | Test en la tarea 1; si no traduce, se detecta por el código de Postgres |
| Un reintento repite un efecto externo (R2, eventos) | Alto: un archivo o evento doble | Solo se reintenta lo que corre adentro de la transacción; subir archivos queda afuera, antes o después |
| Clientes viejos sin `version` | Medio: siguen pisando | Expand: se aceptan y se cuentan (tarea 20); volverla obligatoria se pregunta |
| Tareas largas con la máquina justa de memoria | Bajo | Tests por módulo con 2 workers; la suite completa en los checkpoints |

## Fuera de alcance (anotado, no se toca)

- Better Auth (libros, miembros, invitaciones).
- ExchangeRate, JournalEntry, contribuciones y AuditLog: solo se agregan.
- Borrar una categoría no revisa si tiene movimientos, e ingreso mensual no deja rastro: son
  huecos aparte que salieron en el relevamiento, para después.

## Decidido con Emilio (2026-09-24)

- Plan aprobado.
- Ante un 409, el formulario queda abierto con lo escrito y el aviso ofrece «Cargar lo último».
