# ADR-006: Las escrituras de un libro van en fila, con un candado por libro

## Estado

Aceptado. Reemplaza el punto 2 de la spec de la 6b, que pedía transacciones serializables.

## Fecha

2026-09-24

## Contexto

La 6b ([`docs/plans/2026-09-23-6b-concurrencia.md`](../plans/2026-09-23-6b-concurrencia.md))
tiene que lograr que dos personas escribiendo en el mismo libro no se pisen. La spec proponía
abrir todas las transacciones en Serializable y reintentar hasta tres veces cuando Postgres
aborta una por un cruce.

Se implementó así y se midió antes de seguir, como pedía su supuesto 2:

- Dos libros escribiendo a la vez, cada uno leyendo y agregando filas solo suyas: en las 20
  rondas del test hubo un reintento, aunque no compartían ni una fila.
- Cuatro libros a la vez: 264 intentos para 120 escrituras, y **27 agotaron los reintentos**.
  Esas personas habrían visto «probá de nuevo» sin que nadie más tocara sus datos.

La consulta usaba el índice `(bookId, …)`. Serializable vigila rangos del índice, y el final
del rango de un libro queda pegado al comienzo del siguiente: las filas nuevas de uno caen
en la página que el otro lee. No depende del volumen: se repitió igual con 5000 filas por libro.
La causa exacta no se confirmó mirando `pg_locks`; el efecto sí está medido.

## Decisión

**Cada transacción que escribe en un libro toma primero un candado de ese libro**
(`pg_advisory_xact_lock`), en Read Committed. Las escrituras de un mismo libro van una detrás
de la otra; las de libros distintos no se esperan nunca. En un libro familiar, esperar unos
milisegundos a la otra persona no se nota.

Con eso, más lo que ya decía la spec:

- Las reglas (mes abierto, anulado, conciliado, pagos, bloqueos del cierre) se leen **dentro**
  de la transacción, después del candado. Incluye crear un movimiento y un asiento manual, que
  la spec no mencionaba.
- **Ninguna escritura de un libro puede correr fuera de una transacción**: el filtro de libro
  la rechaza. Una sola escritura sin candado alcanzaría para colarse entre las lecturas de una
  regla, y un control que depende de acordarse no alcanza.
- La clave del candado viaja con la transacción, y escribir en otro libro dentro de ella es un
  error.
- La versión optimista sigue igual: ahí la persona editó con datos que ya cambiaron, y eso
  ningún candado lo arregla.
- El índice único parcial de conciliación sigue igual.
- La espera tiene tope (`lock_timeout`) y el pool está configurado, para que una cola en un libro
  no deje sin conexiones a los demás. Si el tope se agota, la respuesta es `REINTENTAR`.
- Se conserva un reintento acotado ante deadlocks (40P01), que Read Committed también puede dar.
- Lo que no es de un libro (la sincronización del BCCR) corre sin candado.
- Borrar un libro lleva un candado por persona: la regla «no borrar el último» cruza libros.

## Alternativas consideradas

### Serializable con reintentos (lo que pedía la spec)

- A favor: Postgres detecta solo los cruces, sin pensar cada caso de uso.
- En contra: medido, da errores entre libros que no se tocan, y empeora con cada libro nuevo.
- Rechazada: más reintentos y espera los bajan, pero no los eliminan.

### Bloquear filas puntuales (`SELECT … FOR UPDATE`)

- A favor: exacto, sin esperar más de lo necesario.
- En contra: cada caso de uso necesita saber qué fila bloquear, y en qué orden, para no caer
  en deadlocks. Es SQL a mano en cada uno, y el día que alguien se olvide, no hay protección.
- Rechazada: el candado por libro cubre todos los casos de una vez, y el filtro obliga a usarlo.

## Consecuencias

- El criterio 3 de la spec pasa a decir «en fila por libro» en vez de «serializables».
- `withTransaction` necesita saber el libro; sin libro no toma candado.
- Las escrituras que hoy van sueltas (conciliar, categorías, cuentas, cuentas bancarias,
  perfiles, ingreso mensual) pasan a ir en transacción. El plan suma esas tareas.
- Si algún día hay varias instancias de la API, sigue funcionando: el candado es de la base.
  Nunca usar `pg_advisory_lock` de sesión, que PgBouncer rompe.

## Límites conocidos

- El filtro mira el contexto asíncrono, no la conexión. Una referencia a `prisma.client` guardada
  antes de abrir la transacción escribiría por otra conexión, sin candado, y el filtro la
  dejaría pasar. Hoy no existe ninguna; los repositorios piden `client` en cada consulta.
- Las consultas crudas (`$executeRaw`) no pasan por el filtro. Las cuida
  `consultas-crudas.spec.ts`, que solo admite las del candado.
- Cerrar un mes calcula sus bloqueos con el candado tomado: balance por moneda, historia y
  movimientos sin asentar. Medido el 2026-09-24 con cinco años de un libro activo (12 000
  movimientos, 24 000 líneas): 92 a 296 ms, lejos del tope de espera de 4 s. Si un libro llega
  a tardar, lo primero es contar los movimientos sin asentar con un `NOT EXISTS` en SQL.
- El candado por persona protege a quien borra: nunca se queda sin libros. A los demás miembros
  de un libro compartido que se borra, a quien sacan o a quien se va de su único libro se les abre
  uno propio, vacío (decidido por Emilio el 2026-09-24): lo hacen los ganchos y, para lo que se les
  escape, el middleware del libro en el próximo pedido.
- `hashtext` da 32 bits: dos libros pueden caer en la misma clave y esperarse entre sí. Es
  una espera de más, no un error, y con los libros que hay es improbable.
- Lo que se guarda fuera de la base no vuelve atrás con la transacción. El enlace de una
  invitación va al final, para que un fallo del rastro no lo cambie sin dejar constancia. Los
  archivos en R2 se suben antes: un `REINTENTAR` puede dejar uno huérfano (tarea 7 del plan).
