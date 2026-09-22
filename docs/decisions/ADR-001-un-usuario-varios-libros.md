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

- Better Auth agrega al esquema sus propias tablas. No siguen las convenciones del resto ni
  pasan por el dominio hexagonal. Es el precio de no escribirlas.

- **Su modelo `Account` choca con la cuenta contable, y el choque es destructivo.** En este
  proyecto `Account` es el plan de cuentas (`code`, `accountClass`, `parentCode`); Better Auth
  la quiere para guardar credenciales. Al correr su CLI sin precauciones, el 21/09/2026
  sobrescribió `schema.prisma` tomando el plan de cuentas por suyo, y avisó que `code`, `name`
  y `accountClass` «rechazan todo insert que Better Auth hace». Se recuperó porque había copia
  del esquema.

  La decisión fue **renombrar los cinco modelos, no solo el que choca**: `AuthUser`,
  `AuthSession`, `AuthAccount`, `AuthVerification`, y `organization` → `Book` con `BookMember`
  y `BookInvitation`. Renombrar uno solo dejaría la bomba armada para el día que el dominio
  gane una tabla `Session` o `Member`, y renombrarlos todos hace que en `schema.prisma` se
  distinga de un vistazo qué es de la librería.

  Consecuencia: sus tablas quedan en PascalCase mientras las del dominio son snake_case en
  plural. Es una inconsistencia deliberada y conviene dejarla así, porque el nombre de tabla
  lo deriva Better Auth del `modelName` y forzarlo a snake_case se perdería en la próxima
  regeneración del esquema.

- **Su CLI reescribe `schema.prisma` entero.** Hay que hacer copia antes de correr
  `npx auth@latest generate` y revisar el diff después. Reformatea el archivo completo, así
  que el diff va a ser ruidoso aunque no haya cambiado nada de fondo.
- Sus rutas quedan fuera del `createDocument` de `main.ts`. Son unos ocho endpoints, y el
  front necesita tipos a mano para esa parte. Se acota envolviéndolos en un único cliente
  tipado en un solo archivo.
- La integración con NestJS es de la comunidad (`@thallesp/nestjs-better-auth`) y exige
  arrancar Nest con `bodyParser: false`. **Verificado el 21/09/2026** con un spike descartable,
  contra `better-auth@1.7.5`, `@thallesp/nestjs-better-auth@2.8.0`, NestJS 12.0.4, Express
  5.2.1 y Node 24.13, bajo ESM:
  - Arranca sin problemas.
  - Los endpoints existentes **siguen funcionando**: el paquete repone los parsers para las
    rutas que no son de auth. `POST /api/v1/categories` con cuerpo válido devolvió 201 y creó
    la fila; con cuerpo vacío devolvió 400 con el error de Zod campo por campo
    (`name: expected string, received undefined`). Los pipes ven el cuerpo.
  - El registro por correo funciona.
  - La versión 2.8.0 declara peer `@nestjs/common: ^11.1.6 || ^12.0.0`, o sea que **sí
    soporta NestJS 12**. La documentación que decía lo contrario era de una versión anterior.
- Login con Google, 2FA, passkeys y recuperación por correo quedan disponibles por
  configuración el día que el registro se abra.
- En la interfaz nunca aparece la palabra «organización». Se llama libro.

## Corrección del 22 de setiembre de 2026

«Cerrado por invitación» se había implementado como `emailAndPassword.disableSignUp: true`, y
eso no cierra el registro: lo rompe. El invitado necesita una cuenta **antes** de poder aceptar
la invitación, porque `acceptInvitation` de Better Auth se resuelve bajo su middleware de
sesión y no a partir del enlace. Sin registro, el invitado no podía crear la cuenta, y sin
cuenta no podía aceptar la invitación: el flujo trabado contra sí mismo, y nadie más que el
primer usuario podía entrar nunca.

La documentación de Better Auth es explícita al respecto: `disableSignUp` sirve para apagar el
registro, y para permitirlo *condicionalmente* hay que decidirlo en `databaseHooks.user.create.
before` y lanzar un `APIError`. Eso es lo que hace ahora `puedeRegistrarse`, con dos caminos de
entrada y ninguno más: una invitación pendiente y vigente para ese correo, o ser la primera
cuenta de la instancia —a quien levanta su propio Tape Ledger no la puede invitar nadie—.

Queda sin efecto, por lo tanto, la idea de que abrir el registro al público es cambiar un
booleano. Abrirlo es sacar la condición del gancho, y ese día sí hacen falta las piezas que
este ADR difiere: verificación de correo, recuperación y captcha. Lo que la condición permite
hoy es lo que faltaba: que un invitado pueda entrar.
