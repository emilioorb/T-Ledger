# Spec: registrarse exige el enlace de la invitación, no solo el correo

## Objetivo

Hoy crear una cuenta se permite si existe **alguna** invitación vigente para ese correo
(`api/src/modules/identity/infrastructure/auth.config.ts`, `user.create.before`). No se pide
nada del enlace. Quien sepa el correo de una persona invitada se registra antes que ella con ese
correo y entra al libro con el rol de la invitación (hallazgo del security-auditor, 2026-09-23,
severidad media). El enlace de «Dar acceso» lo dice en su propio comentario: «No lleva ningún
secreto».

Se quiere que **solo pueda registrarse quien abrió el enlace**: el enlace lleva un secreto y el
servidor lo compara con la invitación de ese correo. Decidido con Emilio: token en el enlace, no
verificación de correo (no hay proveedor de email).

## Criterios de éxito

1. Registrarse con un correo invitado **sin** el token del enlace, o con un token de otra
   invitación, responde lo mismo que hoy a quien no tiene invitación (`SIN_INVITACION`, sin
   distinguir casos, para no revelar qué correos están invitados).
2. Con el enlace correcto, el registro funciona como hoy: invitación a un libro (entra al libro)
   o invitación a la app (cuenta propia, y la invitación se gasta).
3. La primera cuenta de la instancia sigue sin necesitar invitación.
4. Un token no sirve para otro correo, ni vencido, ni ya usado.
5. Los enlaces que ya se mandaron sin token dejan de servir: quien invitó genera uno nuevo desde
   la pantalla del libro o desde Cuenta. En producción no hay invitaciones vigentes (medido el
   2026-09-23), así que no se corta a nadie.

## Cómo

Revisado con doubt-driven-development (security-auditor como revisor adversarial, 2026-09-23).
La conciliación está al final; cambió el diseño en tres puntos: el id de la invitación a un libro
no sirve de secreto, el token no se guarda en claro, y no viaja en la query de la URL.

- **Un token propio por invitación, de los dos tipos.** Tabla nueva `enlaces_de_invitacion`:
  `tipo` (`LIBRO` o `APP`), el id de la invitación a la que pertenece, `email`, `tokenHash`
  (SHA-256 del token), `expiresAt`, `usedAt`. El token son 32 bytes aleatorios
  (`crypto.randomBytes`) en base64url; **se muestra una sola vez**, al crear el enlace, y en la
  base queda solo el hash. Ningún endpoint de Better Auth lo devuelve (el id de la invitación sí:
  cualquier miembro lo ve en la lista de invitaciones, así que no es un secreto).
- **Copiar el enlace otra vez lo renueva.** Como el token no se puede recuperar, «Copiar enlace»
  genera uno nuevo y el anterior deja de servir. Lo pueden pedir quien puede invitar al libro, o
  quien administra, para la invitación a la app.
- **El token viaja en el fragmento de la URL**: `/crear-cuenta?invitacion=<id>#token=<token>`
  (o sin `invitacion` para la de la app). El fragmento no llega al servidor, ni a los logs de
  Vercel o Railway, ni al Referer. La pantalla lo lee al montar y limpia la URL con
  `history.replaceState`.
- **El registro lo manda en una cabecera** (`x-token-invitacion`), no en el cuerpo: el cuerpo del
  registro acepta objetos (`z.record(z.any())`), y un objeto usado como filtro de Prisma
  (`{"not": ""}`) encontraría la invitación sin saber el token. Antes de consultar se exige que
  sea texto con el largo y el alfabeto exactos de un token; la consulta es por el hash.
- **Falla cerrado y con una sola respuesta.** Sin contexto de pedido, sin cabecera, con un token
  mal formado, ajeno, de otro correo, vencido o usado, y ante cualquier error propio del gancho:
  siempre `APIError('FORBIDDEN', SIN_INVITACION)`. El token nunca se loguea.
- **Se gasta el enlace que se usó**, por su hash y no por correo, en el gancho `after`.
- La primera cuenta de la instancia sigue sin invitación. La carrera de dos registros simultáneos
  en una instancia vacía queda como compromiso documentado: solo existe en el arranque de una
  instalación nueva.
- **Invariante escrito:** hoy el único camino que crea usuarios es correo y contraseña. Cualquier
  plugin que cree usuarios (social, magic link, admin) tiene que pasar por la misma regla antes
  de habilitarse.
- Migración: tabla nueva. Las invitaciones a la app sin enlace se borran (en producción hay 0
  vigentes, medido el 2026-09-23).

## Tareas

1. `puedeRegistrarse` con el token (unit, TDD): sin token, mal formado, ajeno, otro correo,
   vencido, usado, primera cuenta.
2. Migración `enlaces_de_invitacion`, y el caso de uso que crea o renueva un enlace (hash, una
   sola vez en claro). Endpoints para renovar: invitación a un libro (permiso de invitar) e
   invitación a la app (administración).
3. `user.create.before` lee la cabecera y falla cerrado; `after` gasta el enlace por hash. e2e
   para los dos tipos, incluido el filtro inyectado y el token con otro correo.
4. Web: «Dar acceso» e «Invitar» muestran el enlace nuevo; crear cuenta lee el fragmento, limpia
   la URL y manda la cabecera.
5. `/ship` (caso 14, toca auth) y novedades.

## Límites

- Nunca: distinguir en la respuesta «no te invitaron» de «token incorrecto»; loguear el token.
- Preguntar antes: cambiar la duración de las invitaciones o el flujo de aceptación a un libro.

## Conciliación de la revisión adversarial (2026-09-23)

| # | Hallazgo | Clase | Resolución |
|---|---|---|---|
| 1 | El id de la invitación a un libro lo ve cualquier miembro | Bloqueante, accionable | Token propio para los dos tipos |
| 2 | El cuerpo acepta objetos: filtro de Prisma en vez del token | Bloqueante, accionable | Cabecera, validación de forma y consulta por hash |
| 3 | Un token mal formado cambia la respuesta y se loguea | Accionable | Falla cerrado con una sola respuesta; el gancho atrapa todo |
| 4 | El token en la query sale por Referer y logs | Accionable | Fragmento `#token=`, limpiado al montar |
| 5 | Falla abierto si no hay contexto | Accionable | Falla cerrado; invariante escrito para otros plugins |
| 6 | Se gasta por correo, no por el enlace usado | Accionable | Se gasta por hash |
| 7 | La migración de relleno necesita pgcrypto | Accionable | No hay relleno: se borran las sin enlace (0 vigentes) |
| 8 | El token en claro en la base y en la lista | Accionable | Solo el hash; renovar en vez de volver a copiar |
| 9 | Carrera en la primera cuenta | Compromiso | Documentado |
| 10 | El contrato de la web no estaba definido | Accionable | Fragmento, cabecera y limpieza de la URL |


## Conciliación del /ship (2026-09-23)

code-reviewer, security-auditor y test-engineer en paralelo sobre la implementación.

| # | Hallazgo | Clase | Resolución |
|---|---|---|---|
| 1 | Con cuenta, se invita un correo ajeno al libro propio, se registra con ese enlace y se acepta la invitación de otro libro (High) | Bloqueante | Aceptar exige el token de **esa** invitación (`hooks.before` en `/organization/accept-invitation`); cambia el flujo de aceptación, que estaba en «preguntar antes» |
| 2 | `gastar` tira si el enlace ya no está y la cuenta queda sin libro personal | Accionable | `updateMany`; e2e con el enlace renovado en el medio |
| 3 | El enlace de una invitación a un libro vencida salía igual | Accionable | `paraUnLibro` filtra por `expiresAt` |
| 4 | Se perdió el test del borde «vence en este instante» | Accionable | Restituido; probado mutando `>` por `>=` |
| 5 | La guardia del piso se aflojó para que el cambio pase | Accionable | Revertido; las aserciones reescritas quedan marcadas para decidir a mano |
| 6 | Renovar un enlace no dejaba rastro | Accionable | `EnlaceDeInvitacionUseCase` anota en el registro, sin el token |
| 7 | El controlador creaba la clase de infraestructura | Accionable | `EnlacesDeInvitacion` se inyecta desde `IdentityModule` |
| 8 | Falta el invariante de los plugins en el código | Accionable | Comentario junto a `emailAndPassword` |
| 9 | Sin tests de la pantalla de crear cuenta ni de «Enlace nuevo» | Accionable | Tests de pantalla (con la cabecera al registrarse y al aceptar) y de la lista |
| 10 | Un error adentro del gancho no deja rastro | Accionable | Se loguea el tipo de error, sin token ni correo |
| 11 | El fragmento podía llegar a Sentry | Accionable | `scrub` corta en `?` y en `#` |
| 12 | Con cuenta se pueden crear cuentas con correos ajenos (ocupar el correo; `ADMIN_EMAILS` sin cuenta) | Compromiso | Los correos no se verifican; en producción el admin ya tiene cuenta |
| 13 | El historial global del navegador puede guardar el fragmento | Compromiso | Un uso, un correo, una semana |
| 14 | El enlace de la app se crea fuera de la transacción de la invitación | Compromiso | Si falla, se renueva desde la lista |

## Revisión adversarial de los compromisos (2026-09-23)

Los compromisos de la conciliación del /ship se revisaron con doubt-driven-development
(security-auditor como revisor, sin segunda opinión de otro modelo: Emilio eligió saltarla).
Ninguno quedó en pie como estaba escrito.

- **Correos ajenos (12).** No se acepta. Con una cuenta cualquiera se creaba otra con un correo
  de `ADMIN_EMAILS` que no tuviera cuenta (baja del admin, admin nuevo, otra instancia) y se
  administraba la instancia; y se podía ocupar el correo de cualquiera. Decisión de Emilio:
  **solo el admin habilita cuentas**. El enlace de un libro ya no registra: sirve para que
  alguien con cuenta se una, en `/unirse`. El admin se identifica por **id de usuario**
  (`ADMIN_USER_IDS`), que no se puede fabricar. Rechazar una invitación exige el mismo token que
  aceptarla.
- **Historial del navegador (13).** Se acepta con la cota correcta: hace falta acceso al
  navegador de la persona, y solo hasta que ella use el enlace. Las invitaciones a un libro
  vencen a las 48 h, no a los 7 días.
- **Enlace fuera de la transacción (14).** No se acepta: el enlace de la app se crea dentro de
  la misma transacción que la invitación.
