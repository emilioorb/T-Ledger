# ADR-001: Un usuario pertenece a varios libros, con Better Auth

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

Tape Ledger no tiene autenticación: ni usuarios, ni sesiones, ni passport, ni hash de
contraseñas. La app asume una sola persona.

El requisito es que una persona lleve, con un solo correo, su libro personal, el de la casa
con su pareja y el de la familia. El horizonte declarado es que con el tiempo sea un producto
público, aunque arranque cerrado por invitación.

El contrato de la app sale de `createDocument` en `api/src/main.ts`, que junta los paths Zod
de los ocho módulos; el front genera sus tipos de ahí con `npm run api:types`.

## Decisión

El modelo es `User` ↔ `Membership` ↔ `Book`, con las 19 tablas colgando de `bookId` y nunca
de `userId`.

La autenticación se construye con **Better Auth** y su plugin `organization`, donde su
`organization` es nuestro libro. Los roles se definen con `createAccessControl` y `ac.newRole`
en vez de usar los que trae, porque su `member` es solo lectura y confunde con lo que hace
falta: `owner`, `editor`, `viewer`.

## Alternativas consideradas

### Autenticación propia con el mismo contrato Zod

- A favor: un módulo más, igual a los ocho que ya existen. Dominio limpio, esquemas Zod, paths
  en el OpenAPI, tipos generados. Sin dependencias nuevas ni tablas ajenas. Con el registro
  cerrado por invitación, el alcance es chico: no hace falta verificación de correo, ni
  recuperación, ni captcha.
- En contra: no trae nada de invitaciones, membresías ni roles, que es la mitad del trabajo.
  Y auth es el área que peor envejece cuando uno se la construye: lo que hoy alcanza, en dos
  años es lo que los usuarios asumen que existe. Hoy eso son las passkeys.
- Rechazada por el horizonte: si el destino es producto público, login con Google, 2FA y
  passkeys pasan de «algún día» a «se esperan», y en Better Auth son configuración.

### Passport con JWT

- A favor: el camino clásico de NestJS, con documentación abundante.
- En contra: resuelve login y guardias pero nada de libros, membresías ni invitaciones. Y un
  JWT no se puede revocar sin una lista en base, con lo que se terminan guardando sesiones
  igual.
- Rechazada: resuelve la mitad más fácil y deja la difícil.

### Cada usuario con su propio libro, más una vista consolidada

- Rechazada antes de este ADR, el 21/09/2026: el plan de cuentas ya es jerárquico, así que
  «lo mío / lo tuyo / lo nuestro» se modela con cuentas (`1101 Caja Emilio`,
  `1111 Banco común`) sin tocar el esquema contable ni inventar consolidación.

## Consecuencias

- Better Auth agrega al esquema `user`, `session`, `account`, `verification`, `organization`,
  `member` e `invitation`. No siguen las convenciones del resto ni pasan por el dominio
  hexagonal. Es el precio de no escribirlas.
- Sus rutas quedan fuera del `createDocument` de `main.ts`. Son unos ocho endpoints, y el
  front necesita tipos a mano para esa parte. Se acota envolviéndolos en un único cliente
  tipado en un solo archivo.
- La integración con NestJS es de la comunidad (`@thallesp/nestjs-better-auth`) y exige
  arrancar Nest con `bodyParser: false`. Hay que verificarlo contra los pipes de Zod antes de
  comprometer la tarea.
- Login con Google, 2FA, passkeys y recuperación por correo quedan disponibles por
  configuración el día que el registro se abra.
- En la interfaz nunca aparece la palabra «organización». Se llama libro.
