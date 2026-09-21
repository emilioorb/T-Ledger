# ADR-005: Sentry no recibe un solo dato del libro

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

Con usuarios que no son uno mismo hace falta saber cuándo se rompe algo, porque nadie va a
reportarlo. Hoy los errores se ven en la consola del que está programando.

Ya existe una organización en Sentry, `arclo-systems`, con tres proyectos (`kodi`,
`kodi-admin`, `kodi-backend`). No hay ninguno de Tape Ledger.

Sentry instalado por defecto se lleva el cuerpo de las peticiones. Un error en
`POST /movimientos` viaja con el monto, la descripción y la categoría. Los breadcrumbs del
front graban qué se tocó y qué se escribió. Session Replay graba la pantalla. Todo eso sale
del servidor hacia un tercero en otro país.

Eso es exactamente lo que el producto promete no hacer, y en cuanto empieza a pasar, Sentry se
convierte en una segunda copia de la contabilidad que no se controla.

Configurar el filtrado después de haber mandado datos llega tarde.

## Decisión

Dos proyectos siguiendo la convención existente: `tape-ledger` y `tape-ledger-backend`.

**El filtro deniega por defecto y permite explícitamente.** El `beforeSend` borra el cuerpo de
la petición entero y deja pasar solo endpoint, código de error, versión y traza.

Sin Session Replay. `sendDefaultPii` apagado.

El usuario viaja como `{ id }` opaco y nada más. Alcanza para lo único que importa: saber si
un error le pasó a una persona o a doscientas. Quién es se resuelve contra la propia base, que
es donde vive esa relación.

El DSN va por variable de entorno en `loadEnv`, con el resto de la configuración.

## Alternativas consideradas

### Filtrar por lista de campos prohibidos

- A favor: deja pasar contexto útil para depurar, como el id del recurso.
- Rechazada: se rompe en silencio la primera vez que alguien agrega una columna y no se
  acuerda de sumarla a la lista. Un filtro que falla abierto en un sistema de privacidad es
  peor que no tener filtro, porque da confianza falsa.

### Mandar también el correo del usuario

- A favor: se le puede escribir directo a quien sufrió el error sin consultar la base.
- Rechazada: la lista de usuarios termina copiada en Sentry, fuera de control y fuera del
  alcance de cualquier borrado de cuenta.

### Errores anónimos, sin usuario

- A favor: lo máximo en privacidad.
- Rechazada: sin conteo de personas afectadas, un error que revienta a un usuario y otro que
  revienta a todos se ven igual, y así no se decide qué arreglar primero.

### No usar Sentry

- Rechazada: con usuarios reales que no reportan nada, no tener observabilidad significa
  enterarse de los errores cuando alguien se va.

## Consecuencias

- Los errores de Sentry van a tener menos contexto del habitual. Reproducir va a costar más, y
  hay que compensarlo con mensajes de error del dominio que digan qué pasó sin decir con qué
  datos.
- El audit log y Sentry resuelven cosas distintas y no se mezclan. El audit log es propio,
  vive en la base junto a los datos y contesta «quién cambió esto». Sentry es de terceros y
  solo contesta «esto se rompió acá».
- Si alguna vez se activa Session Replay, esta decisión hay que revisarla entera: un replay
  con los montos enmascarados sigue mostrando la estructura de la pantalla y el
  comportamiento.
