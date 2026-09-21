# ADR-002: El aislamiento entre libros va en dos capas

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

Con varios libros en la misma base, el peor error posible es una fuga: una consulta que se
olvide de filtrar y le muestre a alguien los movimientos de otra familia. Es silencioso —
nadie reporta ver datos de más — y en una app de finanzas es el fin del producto.

En `api/src` hay 362 ordenamientos, 234 agregaciones, 20 búsquedas por texto y 7 consultas
crudas repartidas en 14 repositorios. Filtrar a mano en cada una es cientos de lugares donde
alcanza con olvidarse en uno.

`PrismaService` ya tiene una sola puerta: el getter `client` en
`api/src/shared/prisma/prisma.service.ts`, por donde pasan los 14 repositorios sin excepción,
y ya viaja un `AsyncLocalStorage` para el cliente transaccional.

Prisma 7 removió `$use`, así que las client extensions son el único mecanismo disponible para
interceptar consultas. La documentación de Prisma las señala como la forma de lograr
aislamiento por usuario.

La skill de seguridad de addy pone «Broken Access Control» como su cuarta vulnerabilidad y
exige chequeo explícito en cada endpoint: *Every endpoint checks user permissions*.

## Decisión

Dos capas, porque cubren agujeros distintos.

**1. Filtro automático.** El `bookId` viaja por el `AsyncLocalStorage` que ya existe. El
getter `client` devuelve un cliente extendido que inyecta `where: { bookId }` en toda
consulta. Un solo archivo cambia; los 14 repositorios no se tocan.

**Si no hay `bookId` en el contexto, la consulta tira error.** Nunca devuelve todo.

**2. Guardia de rol explícita por endpoint.** La extensión sabe *de qué libro*; no sabe si
podés *escribir*. Alguien con rol `viewer`, correctamente filtrado a su libro, editaría un
movimiento si nadie chequea el rol.

Row-Level Security de Postgres queda anotada como refuerzo para cuando el registro se abra al
público, no ahora.

## Alternativas consideradas

### Filtrar a mano en cada repositorio

- A favor: no hay magia, se lee en el código lo que pasa.
- En contra: cientos de lugares, y un olvido no avisa.
- Rechazada: la cantidad convierte el error en cuestión de tiempo.

### Solo el filtro automático, sin guardia de rol

- Rechazada: deja entera la segunda mitad del problema, que es lo que addy marca como
  obligatorio. Filtrar bien y dejar escribir a quien no debe es igual de grave.

### Row-Level Security de Postgres, ahora

- A favor: la base garantiza el aislamiento aunque el código se equivoque. Es lo que pediría
  una auditoría de seguridad para multi-tenant público.
- En contra: cada consulta tiene que correr con `SET LOCAL` dentro de su transacción, y hoy
  las lecturas no van en transacción. Con el pool de Prisma eso es fricción real.
- Postergada, no rechazada: vuelve a la mesa cuando se abra el registro.

## Consecuencias

- Los 59 specs existentes corren sin contexto de libro y van a fallar todos hasta que se les
  dé uno. Es el costo de que el filtro falle cerrado, y es la prueba de que funciona: un test
  que pasara sin libro significaría una consulta sin filtrar.
- Hace falta un test de aislamiento por repositorio: crear dos libros y verificar que uno no
  ve al otro.
- Los errores responden 403 tanto por rol insuficiente como por recurso de otro libro. Nunca
  404, porque un 404 distinto de un 403 confirma que ese id existe en algún lado.
