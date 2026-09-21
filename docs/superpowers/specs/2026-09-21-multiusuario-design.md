# Diseño — Fase 6: cuentas, libros compartidos y el camino al cifrado

Fecha: 2026-09-21
Estado: pendiente de revisión. 6a al nivel implementable; 6b y 6c a nivel de decisión.

## 1. Propósito

Hoy Tape Ledger no sabe quién sos. No hay usuarios, ni sesiones, ni login: la app asume que
del otro lado hay una sola persona y que esa persona es la dueña de todo lo que ve.

Esta fase responde tres preguntas que hoy no tienen respuesta:

- ¿Cómo lleva alguien su libro personal, el de la casa y el de la familia con un solo correo?
- ¿Cómo entra una segunda persona a un libro sin ver los libros ajenos ni poder romper lo que
  no le toca?
- ¿Quién anotó esto, y cuándo?

## 2. Alcance: son tres proyectos, no uno

La nota original trataba la fase como una sola cosa. No lo es, y solo una de las tres tiene
riesgo de verdad.

**6a — Cuentas y libros compartidos.** Usuarios, sesión, libros, membresías, roles,
invitaciones, audit log, exportación y operaciones destructivas. El servidor sigue calculando
la contabilidad como hasta ahora. Es lo que da el objetivo del producto: llevarlo en pareja o
en familia.

**6b — Concurrencia.** Dos personas escribiendo a la vez.

**6c — Cifrado extremo a extremo.** El volteo de arquitectura.

**Este spec detalla 6a hasta el nivel implementable.** 6b y 6c quedan con sus decisiones
tomadas y escritas, pero sin desglose de tareas: el plan sale solo de 6a.

El orden importa. 6a da casi todo el valor con poco riesgo, y sin 6a no hay con qué probar
6c, porque hoy no existe ni el concepto de usuario.

## 3. Las decisiones que gobiernan la fase

**1. Un usuario, varios libros. Las tablas cuelgan del libro, nunca del usuario.**
Una persona tiene un correo y una contraseña, y pertenece a varios libros con un rol en cada
uno. Si las 19 tablas colgaran del usuario, el caso de pareja no existe y hay que migrar todo
después. Ver ADR-001.

**2. El cifrado se decide con el sistema andando, no ahora.**
El E2E obliga a volverse local-first, y eso son 234 agregaciones, 362 ordenamientos y 14
repositorios rehechos. Esa decisión se toma cuando haya un libro compartido en uso real, no
en abstracto. El esquema de 6a se diseña sin cerrarle la puerta. Ver ADR-003.

**3. El aislamiento va en dos capas porque cubren agujeros distintos.**
La extensión de Prisma sabe *de qué libro*; no sabe si podés *escribir*. Alguien con rol de
solo mirar, correctamente filtrado a su libro, igual editaría un movimiento si nadie chequea
el rol. Ver ADR-002.

**4. El audit log se escribe en la misma transacción que el cambio.**
No puede existir un cambio sin su rastro ni un rastro sin su cambio. Ver ADR-004.

**5. Nada que se borre puede llevarse datos de otra persona en silencio.**
Borrar tu cuenta no puede borrarle la contabilidad a tu pareja sin que se entere.

**6. Sentry no recibe un solo dato del libro.**
Ver ADR-005.

## 4. Modelo de datos

### Lo que trae Better Auth

`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`.

Su `organization` **es** el libro. En la interfaz se llama libro y la palabra «organización»
no aparece nunca. Es el precio de usar una librería que resuelve el problema: sus tablas no
siguen las convenciones del resto del esquema ni pasan por el dominio hexagonal.

### Roles

Los roles por defecto de Better Auth (`owner`, `admin`, `member`, donde `member` es solo
lectura) confunden con lo que hace falta acá. Se definen propios con `createAccessControl` y
`ac.newRole`:

- `owner` — invita, saca gente, cambia roles, borra el libro
- `editor` — todo lo contable: anota, edita, cierra meses, presupuesta
- `viewer` — solo mira

### Lo que se agrega al esquema existente

`bookId` en las 19 tablas, con índice compuesto donde ya hay índices de consulta.

```prisma
model AuditEntry {
  id        String   @id @default(uuid())
  bookId    String
  userId    String?  // null cuando la cuenta se eliminó: el rastro sobrevive al usuario
  entity    String   // "Movement", "AccountingPeriod", "Member"…
  entityId  String
  action    String   // "created" | "updated" | "deleted" | "closed" | "reopened"
  changes   Json     // { campo: { antes, despues } }
  at        DateTime @default(now())

  @@index([bookId, at])
  @@index([bookId, entity, entityId])
}
```

`changes` guarda qué campo cambió y sus dos valores. Cuando llegue 6c, el servidor no va a
poder ver los valores; la estructura ya separa «qué campo» de «a qué valor», así que
recortarlo es quitar una mitad y no rediseñar la tabla.

### Migración

El libro que existe hoy se vuelve un libro llamado «Personal», con Emilio de `owner`, y todas
las filas existentes reciben ese `bookId`.

## 5. Aislamiento

`PrismaService` ya tiene **una sola puerta**: el getter `client`, por donde pasan los 14
repositorios sin excepción, y ya viaja un `AsyncLocalStorage` para la transacción. El `bookId`
viaja por el mismo camino.

Un guard de Nest puebla el contexto `{ bookId, userId, rol }` desde la sesión y el libro
activo. El getter `client` devuelve el cliente extendido con el filtro de `bookId` inyectado.
Un solo archivo cambia y los 14 repositorios no se tocan.

**La regla que hace que esto no se degrade:** si no hay `bookId` en el contexto, la consulta
tira error. Nunca devuelve todo. Un olvido revienta ruidoso en el primer test en vez de
filtrar mal en silencio, que es el peor error posible en esta app porque nadie lo reporta.

Prisma 7 removió `$use`, así que las client extensions no son una opción entre varias: son el
único mecanismo disponible.

Encima va la guardia de rol por endpoint, explícita.

**Errores:** 401 sin sesión. 403 si el rol no alcanza o si el recurso es de otro libro.
Nunca 404, porque un 404 distinto de un 403 confirma que ese id existe en algún lado.

## 6. Audit log

Se registra donde hay plata o decisiones: movimientos, cierres y reaperturas de mes, deudas,
metas, inversiones, presupuestos, y cambios de miembros o roles.

Quedan fuera los catálogos —categorías, plan de cuentas— donde el rastro no resuelve ninguna
discusión. Y quedan fuera los asientos, que ya son inmutables y se revierten en vez de
editarse: el libro contable ya tiene su propia trazabilidad y duplicarla sería ruido.

Se escribe dentro del `withTransaction` que ya existe. No hay endpoint que lo edite ni lo
borre. Cuando una cuenta se elimina, sus entradas no se borran: el `userId` pasa a `null` y
se muestran como «cuenta eliminada». Ese rastro pertenece al libro, no al usuario, y borrarlo
le saca a otra persona la historia de su propia contabilidad.

## 7. Exportar, vaciar, eliminar

Son tres cosas distintas y mezclarlas es lo que hace que estos flujos salgan mal.

### Exportar

La más valiosa de las tres, y tiene que existir aunque nadie borre nada. Es la salida del
producto y es lo que hace que «sin recuperación» sea una opción vivible en vez de una trampa.

Un JSON con el libro entero, que es el respaldo real, más CSV por entidad para abrir en
Excel.

**Se arma desde los datos que el cliente ya tiene cargados, no desde un endpoint que lea la
base.** Con 6c el servidor no va a poder construir ese archivo; diseñarlo así desde ahora
cuesta lo mismo.

### Vaciar el libro

Borra el contenido del libro activo y lo deja vivo con su plan de cuentas semilla. Es para
arrancar de nuevo sin perder la cuenta ni los miembros. Pide contraseña.

### Eliminar la cuenta

Es la única que toca a otras personas.

**Si sos el único `owner` de un libro que comparten otros, el flujo se frena.** Muestra los
libros que bloquean, y hay que pasar la propiedad a otro miembro o borrar ese libro con su
propia confirmación. Es un paso más, y es el único camino donde nadie pierde datos sin
enterarse.

### El flujo, igual en las dos destructivas

1. **Exportar.** Botón de descarga, y no se avanza sin descargar o sin marcar que no se
   quiere.
2. **Lo que se pierde**, con números reales: «1 842 movimientos, 14 meses cerrados, 3 metas».
3. **Confirmar.** Contraseña en las dos. Eliminar pide además escribir el nombre exacto,
   porque la contraseña está guardada en el navegador y se pone sin leer.

## 8. Observabilidad

Dos proyectos en la organización `arclo-systems` de Sentry, siguiendo la convención que ya
existe ahí: `tape-ledger` y `tape-ledger-backend`.

Sentry instalado por defecto se lleva el cuerpo de las peticiones. Un error en
`POST /movimientos` viaja con el monto, la descripción y la categoría. Los breadcrumbs del
front graban qué se tocó y qué se escribió. Eso sale del servidor hacia un tercero en otro
país, que es exactamente lo que el producto promete no hacer.

**El filtro deniega por defecto y permite explícitamente.** El `beforeSend` borra el cuerpo
entero y deja pasar endpoint, código de error, versión y traza. Una lista de campos
prohibidos se rompe en silencio la primera vez que alguien agrega una columna y no se acuerda
de sumarla.

Sin Session Replay. El usuario viaja como `{ id }` opaco y nada más: alcanza para saber si un
error le pasó a una persona o a doscientas, y quién es se resuelve contra la base, que es
donde vive esa relación.

El DSN va por variable de entorno en `loadEnv`, con el resto de la configuración.

## 9. API

Better Auth monta su propio router, fuera del `createDocument` de `main.ts`. Son unos ocho
endpoints y el front necesita tipos a mano para esa parte. Es el costo aceptado en ADR-001.

Todo lo demás sigue en el contrato Zod → OpenAPI → tipos generados, con estos agregados:

```
GET    /api/v1/libros                    Los libros del usuario, con su rol
POST   /api/v1/libros/:id/activo         Cambiar el libro activo
GET    /api/v1/libros/:id/historial      Audit log paginado
GET    /api/v1/libros/:id/exportacion    JSON completo
DELETE /api/v1/libros/:id/contenido      Vaciar (pide contraseña)
POST   /api/v1/libros/:id/propietario    Pasar la propiedad a otro miembro
GET    /api/v1/cuenta/bloqueos           Libros que impiden eliminar la cuenta
```

Eliminar la cuenta es de Better Auth. Lo que agregamos es el paso previo: `bloqueos` devuelve
los libros donde sos el único `owner` y hay otros miembros, que es lo que frena el flujo.

## 10. Pantallas

- Login
- Selector de libro en la barra lateral
- Miembros: quién está, con qué rol, invitar, sacar, cambiar rol
- Historial: el audit log, filtrable por persona y por entidad
- Cuenta: exportar, vaciar, eliminar

## 11. 6b — Concurrencia

Prisma documenta los dos mecanismos y aclara que no trae ninguno integrado.

**Control optimista con campo `version`.** Cada entidad editable lleva un entero. El update
va como `updateMany` con `where: { id, version }` e incrementa la versión; si `count === 0`,
alguien la cambió en el medio y en vez de pisar se avisa. Para una contabilidad compartida,
pisar en silencio es el peor resultado posible.

**Aislamiento serializable con reintento.** Para las operaciones que escriben dos veces —el
movimiento y su asiento, el aporte y su asiento— con `isolationLevel: Serializable` y
reintento ante el error `P2034`. El `withTransaction` que ya existe es el lugar exacto donde
va ese reintento.

Este es el punto de contacto con la fase 0 que marcaba la nota original.

## 12. 6c — Cifrado extremo a extremo

### Modelo de llaves

Una llave por libro, generada en el navegador del que lo crea, envuelta una vez por cada
miembro con su clave pública. Es el modelo de bóvedas de 1Password, y el caso de tres libros
lo confirma: la llave va por libro, no por usuario.

La contraseña no cifra los datos. Deriva una llave que envuelve tu par de claves, así cambiar
la contraseña no obliga a recifrar el libro entero.

### Recuperación

**Lo elige cada quien al crear la cuenta**, en una pantalla que explica las dos opciones:

- **Recuperable.** Se guarda una copia de tu clave privada envuelta con una llave del
  servidor. Si perdés todo, se te devuelve el acceso.
- **Sin recuperación.** Solo existe la frase de doce palabras. Ni el servidor puede.

Es el modelo de Apple, y existe porque la gente pierde las llaves y después culpa al producto.
Que la promesa fuerte esté disponible no significa que tenga que costarle los datos a quien
nunca la pidió.

Aclaración que hay que hacerle al usuario sin letra chica: la contraseña sirve para entrar y
se puede resetear; la frase sirve para descifrar y no. Sin la frase, entrás y encontrás la app
vacía, con tus datos intactos e ilegibles para siempre.

Atenuante real: si el libro es compartido, el otro miembro le vuelve a envolver la llave con
su clave pública nueva y lo recupera entero. Solo se pierden los libros donde estaba solo.

### Verificación de miembros

**Obligatorio, no opcional.** El servidor reparte las claves públicas. Si miente y te pasa la
suya en vez de la de tu pareja, envolvés la llave del libro para el servidor y lee todo, sin
romper una sola línea de criptografía. La defensa es que los dos comparen una huella corta
fuera de la app, como los números de seguridad de Signal. Sin ese paso, el E2E de un libro
compartido es decorativo.

### Sobre demostrarle al usuario que está cifrado

No existe herramienta que lo pruebe, y el motivo es que el servidor sirve el código que hace
el cifrado: mañana puede mandar un JavaScript que se lleve la llave y la app se ve igual. Lo
que existe:

- **Verificar la llave del otro miembro.** Lo único verificable por el usuario. Ya está
  arriba y es obligatorio.
- **Mostrar el blob.** Una pantalla con los bytes que el servidor guarda para un movimiento
  suyo. No es prueba criptográfica, es demostración, y es lo único de la lista que convence a
  alguien que no programa. Cuesta un endpoint.
- **Código abierto con compilación reproducible.** Lo verifica la comunidad, no el usuario.
- **Extensión que compara hashes contra un manifiesto de un tercero.** El precedente es Code
  Verify, de Cloudflare para WhatsApp Web. Necesita un tercero neutral publicando manifiestos.
- **Auditoría externa.** No es verificación, es confianza transferida a un auditor.

### El volteo

El dominio de 5 712 líneas corre en el navegador tal cual, porque el linter mantiene
`api/src/modules/*/domain/**` libre de Nest, Prisma y HTTP y no hay una sola violación. Los 14
repositorios se rehacen contra IndexedDB y el backend queda como buzón de blobs.

## 13. Riesgos

**Los 59 specs existentes van a fallar todos.** Corren sin contexto de libro, y con la
extensión fallando cerrado ninguno pasa hasta que se les dé uno. Es doloroso y hay que
presupuestarlo, pero es la prueba de que la red funciona: si algún test pasara sin libro,
significaría que hay una consulta sin filtrar.

**Better Auth mete tablas ajenas al esquema.** No siguen las convenciones ni pasan por el
dominio. Aceptado en ADR-001.

**Dos sistemas de tipos en el front.** Los ocho endpoints de auth quedan fuera del OpenAPI.
Se acota envolviéndolos en un único cliente tipado a mano, en un solo archivo.

**La fuga entre libros es el peor error posible y es silencioso.** Por eso las dos capas y un
test de aislamiento por repositorio, que cree dos libros y verifique que uno no ve al otro.

## 14. Fuera de alcance

Login con Google, 2FA, passkeys y recuperación de contraseña por correo: Better Auth los trae
y se prenden por configuración cuando el registro se abra. No se construyen ahora.

Registro abierto, verificación de correo obligatoria, captcha y límite de intentos: llegan
con la apertura al público, no antes.

Equipos dentro de un libro, permisos por cuenta contable, y libros anidados.
