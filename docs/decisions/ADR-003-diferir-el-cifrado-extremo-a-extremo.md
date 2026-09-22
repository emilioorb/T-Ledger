# ADR-003: El cifrado extremo a extremo se difiere, no se descarta

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

El 21/09/2026 se decidió que T-Ledger tuviera cifrado extremo a extremo: ni el dueño del
servidor puede ver los datos de nadie.

Medido sobre el código real, eso cuesta: 234 agregaciones (`groupBy`, `aggregate`, `_sum`),
362 ordenamientos, 20 búsquedas por texto y 7 consultas crudas que el servidor no podría
hacer sobre datos que no puede leer. Los 14 repositorios se rehacen.

El E2E no es una opción independiente: si el servidor no puede sumar, el cálculo se muda al
cliente; si el cálculo está en el cliente, el cliente necesita todos los datos. Eso es
local-first, y trae su propio problema difícil, que no es el cifrado sino la resolución de
conflictos entre dispositivos desconectados.

Hoy no existe ni el concepto de usuario en la app, así que no hay con qué probar nada de esto.

La skill de seguridad de addy no menciona cifrado de datos, ni E2E, ni verificación: lo único
que dice de criptografía es hashear contraseñas con argon2. No es un olvido, es que la guía
de seguridad estándar no lo contempla porque casi nadie lo hace.

## Decisión

Se construye primero 6a (cuentas y libros compartidos) con el servidor calculando como hasta
ahora. El cifrado se decide después, con el sistema en uso real.

El esquema de 6a se diseña sin cerrarle la puerta:

- El audit log separa «qué campo cambió» de «a qué valor», así que recortarlo bajo cifrado es
  quitar una mitad y no rediseñar la tabla.
- La exportación se arma desde los datos que el cliente ya tiene cargados, no desde un
  endpoint que lea la base, porque con cifrado el servidor no podría construir ese archivo.

Las decisiones de diseño de 6c quedan tomadas y escritas en el spec, para que la postergación
no sea una excusa para no haber pensado: modelo de llaves por libro, recuperación elegida por
el usuario, y verificación de miembros con huella fuera de banda.

## Alternativas consideradas

### E2E desde el día uno

- A favor: no hay que migrar datos ya escritos en claro, y la promesa está desde el principio.
- En contra: es el proyecto más grande de los tres y no hay con qué probarlo hasta tener
  cuentas. Se estaría decidiendo la arquitectura de la app entera en abstracto.
- Rechazada por orden, no por mérito.

### Cifrado en reposo con llave del servidor

- A favor: protege contra el robo del disco o de un dump. Conserva todo el SQL, la paginación
  y los reportes, y permite recuperar la contraseña. Es lo que recomienda la skill de addy y
  lo que hace la industria.
- En contra: no cumple la promesa declarada, que es que ni el dueño del servidor pueda ver
  los datos.
- No rechazada: es la opción por defecto si 6c nunca se hace, y hay que decirlo con esas
  palabras en vez de dejar la promesa flotando.

## Consecuencias

- Mientras 6c no exista, el producto **no puede prometer** que el dueño del servidor no ve los
  datos. Cualquier copia que lo diga sería falsa.
- 6a queda condicionado en dos puntos concretos (audit log y exportación) que cuestan lo mismo
  ahora y evitan rehacerlos después.
- Si 6c se hace, el dominio de 5 712 líneas corre en el navegador tal cual: el linter mantiene
  `api/src/modules/*/domain/**` libre de Nest, Prisma y HTTP, y no hay una sola violación.
  Esa limpieza es lo que mantiene la puerta abierta y no hay que dejarla degradar.
