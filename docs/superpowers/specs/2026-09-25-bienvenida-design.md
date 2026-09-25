# Bienvenida — diseño

**Fecha:** 2026-09-25
**Estado:** en revisión
**Revisión adversarial:** tres ciclos con contexto limpio sobre la parte de api y datos (§4–§6).
Lo que encontraron está incorporado; lo que quedó como trade-off está en §10.

## 1. Objetivo

Quien se registra entra hoy a un tablero vacío con un solo botón a Movimientos, un plan de
cuentas genérico y ninguna categoría. La bienvenida resuelve tres cosas a la vez:

1. **Orientar:** qué es T-Ledger y por dónde se empieza.
2. **Configurar en un solo lugar** lo que hoy exige visitar cinco pantallas.
3. **Personalizar el plan de cuentas** desde el inicio: sus bancos, sus categorías.

Éxito es: al cerrar el modal, la persona tiene sus bancos como cuentas, sus saldos de hoy
cargados, categorías con cuenta propia y el ingreso del mes declarado, y sabe dónde está la guía.

## 2. Decisiones de producto

1. Un modal guiado por **Nimbo** (`web/src/features/shell/bloub.tsx`) con una burbuja de
   diálogo. Cambia de gesto según el paso.
2. Pasos: **intro → monedas → bancos → saldos → categorías → ingreso → cierre**. Todos salvo
   la intro y el cierre se pueden saltear.
3. **Se muestra una sola vez.** Se marca como vista al abrirse; si se cierra a mitad, lo
   confirmado queda y el modal no vuelve. No se reabre desde ningún menú.
4. **Lo confirmado se guarda paso a paso.** Reintentar no duplica.
5. **Invitados:** quien se registra teniendo una invitación pendiente a un libro no la ve.
   Quien se registra sin invitación a un libro la ve en su libro propio, aunque después lo
   inviten a otro.
6. **Quien ya usa la app no la ve**, tampoco cuando recibe un libro nuevo.
7. **Categorías:** sugerencias preseleccionadas más las propias. Cada una crea su cuenta.
8. **Presupuesto:** solo el ingreso del mes. El reparto se arma después en Modelos, y el cierre
   lo enlaza.
9. **Sin perfiles de importación.** Las cuentas bancarias nacen sin perfil.
10. **El cierre invita a leer la guía** (`/guia`).

## 3. Fuera de alcance

- Crear el modelo de presupuesto desde la bienvenida (plantilla 50/30/20 con cubetas mapeadas).
  Se puede sumar después sin romper nada.
- Deudas, metas e inversiones: el cierre puede nombrarlas, pero se cargan en sus pantallas.
- Perfiles de importación de CSV por banco.
- Desactivar las cuentas en dólares cuando se elige solo colones (ver §10).

## 4. Datos

### 4.1 Marca «ya la vio», por persona

Campo nuevo `bienvenidaVistaEn DateTime?` en `authUser`, declarado en `user.additionalFields`
de Better Auth con **`input: false`**: sobrevive a la regeneración del esquema (ADR-001) y no
se puede escribir desde `/update-user` ni desde el sign-up.

Migración: a los usuarios existentes se les pone su `createdAt`.

La marca es de la persona y no del libro porque los libros nuevos aparecen solos: al
registrarse, al quedarse sin libro (`libro-propio.ts`) y al crear otro. Marcar el libro haría
aparecer el modal en cada uno de esos casos.

### 4.2 Progreso, por libro

Tabla nueva:

```prisma
model OnboardingStep {
  bookId    String
  step      String   // 'banks' | 'opening-balances' | 'categories' | 'income'
  result    Json
  createdAt DateTime @default(now()) @db.Timestamptz(3)

  book book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@id([bookId, step])
  @@map("onboarding_steps")
}
```

- Entra al filtro de libro (ADR-002) como cualquier tabla con `bookId`.
- `onDelete: Cascade`, como exige `borrado.spec.ts`.
- En `SE_BORRA` de `libro/domain/vaciado.ts`: vaciar el libro borra los asientos y cuentas que
  los resultados nombran, así que el progreso se va con ellos. No reabre el modal: la marca es de
  la persona.

El progreso vive en el libro porque lo que se crea es del libro. El candado de la
transacción también es por libro (ADR-006), así que leer, escribir y guardar el progreso
comparten el mismo candado.

## 5. API — módulo `onboarding`

Módulo nuevo, `@Controller('onboarding')`, rutas en inglés como el resto.

**Solo coordina.** No escribe en repositorios ajenos: llama a los casos de uso existentes, que
así conservan sus reglas (árbol de cuentas, cuenta que acepta asientos, control optimista 6b).
Cambios de `exports` necesarios:

| Módulo | Agregar a `exports` |
|---|---|
| accounting | `SaveAccountUseCase`, `ManageCategoriesUseCase` (`CreateJournalEntryUseCase` ya está) |
| banking | bloque `exports` nuevo con `ManageBankAccountsUseCase` |
| budget | `DeclararIngresoUseCase` |
| identity | puerto `MarcaDeBienvenida` (ver §5.2) |

**Permiso.** Recurso nuevo `bienvenida: ['write']`, solo en el rol `owner`, en `roles.ts` y
`permisos.ts`. `cobertura-de-permisos.spec.ts` lo exige en cada POST.

**Rastro.** ADR-004 tal cual: no se agrega ninguna entidad auditada. Deja rastro solo lo que ya
lo deja por su caso de uso (el ingreso del presupuesto). Cuentas, categorías y asientos quedan
fuera, como hoy (`cobertura-de-rastro.spec.ts`).

### 5.1 Pasos idempotentes

Cada paso corre dentro de `withTransaction`, que es reentrante (`prisma.service.ts:102`):

1. Lee su fila de `OnboardingStep`.
2. Si existe, devuelve el `result` guardado sin escribir nada. Es la respuesta a un reintento
   después de una respuesta perdida.
3. Si no, ejecuta los casos de uso y guarda la fila con el resultado, en la misma transacción.

Un paso que falla a la mitad no deja fila: todo se revierte y se puede reintentar.

### 5.2 Marca y estado

**Puerto `MarcaDeBienvenida`** en identity, con su adaptador sobre `clientSinFiltroDeLibro`,
como el resto de los accesos a tablas de Better Auth:

- `pendiente(userId): Promise<boolean>`
- `marcar(userId): Promise<void>`: `updateMany({ where: { id, bienvenidaVistaEn: null } })`.
  Marcar dos veces no es un error.

| Endpoint | Qué hace |
|---|---|
| `GET /onboarding` | `{ pending, bookId, steps }`. `pending` = la marca está en null **y** la persona es `owner` del libro activo. `steps` son los resultados guardados de ese libro |
| `POST /onboarding/start` | `marcar(userId)`. Responde 204 siempre |

**Invitados.** En `user.create.after` de `auth.config.ts`, antes de crear el libro «Personal»:
si existe un `bookInvitation` con ese correo, `status: 'pending'` y `expiresAt` futuro, se
marca `bienvenidaVistaEn`. El error se atrapa y se loguea sin datos, como en los otros ganchos
`after`: una bienvenida de más es mejor que un registro roto.

### 5.3 Pasos

| Paso | Endpoint | Qué hace | `result` |
|---|---|---|---|
| Bancos | `POST /onboarding/banks` `{ banks: [{ name, currency }] }` | Por cada uno: `SaveAccountUseCase.create` con el siguiente código libre entre **1121 y 1189**, hija de 1100, y `ManageBankAccountsUseCase.create` atada a esa cuenta, sin perfil | `[{ name, currency, accountCode, bankAccountId }]` |
| Saldos | `POST /onboarding/opening-balances` `{ date, balances: [{ accountCode, amount }] }` | Ver §5.4 | `{ entries: [{ currency, journalEntryId }] }` |
| Categorías | `POST /onboarding/categories` `{ categories: [{ name, kind }] }` | Ver §5.5 | `[{ name, kind, accountCode, categoryId }]` |
| Ingreso | `POST /onboarding/income` `{ month, amount }` | `DeclararIngresoUseCase.execute(..., null)` | `{ month, amount }` |

Monedas no tiene endpoint: la elección vive en el estado del modal y decide si los pasos
siguientes ofrecen dólares.

### 5.4 Saldos iniciales

- **Cuentas aceptadas:** las cajas y los `accountCode` del resultado del paso Bancos, de donde
  sale su moneda. Las cajas salen de una constante `CAJAS` exportada por accounting **junto a
  la semilla** (`1101 → CRC`, `1102 → USD`), con un test que verifica que existen en
  `CHART_SEED`.
- **Un asiento de apertura por moneda,** con `CreateJournalEntryUseCase` y la fecha `date` que
  manda el cliente, que es su fecha local: el servidor calcula en UTC, y después de las 18:00
  de Costa Rica «hoy» sería mañana.
- **Montos:** los positivos van al debe de la cuenta y los negativos (sobregiro) al haber. En
  las cajas no se aceptan negativos (422). Los montos en cero se ignoran.
- **Contrapartida:** el neto de cada moneda va a Aportes (3110). Si el neto es cero, se omite
  esa línea.
- **Validación:** un `accountCode` repetido en el mismo pedido da 400.

### 5.5 Categorías

- Si no existen, se crean las agrupadoras **6200 «Gastos por categoría»** (hija de 6000) y
  **4200 «Ingresos por categoría»** (hija de 4000). Si ya existen como cuenta que acepta
  asientos, el paso da 422 en vez de convertirlas en agrupadoras.
- Cada categoría de gasto crea una cuenta **6201–6299** hija de 6200, y cada una de ingreso
  una **4201–4299** hija de 4200. Después se crea la categoría atada a su cuenta.
- Los nombres duplicados, dentro del pedido o contra las categorías que ya existen, dan
  **409 `CONFLICT`**. Se comprueban dentro de la transacción.

### 5.6 Códigos

La función pura `siguienteCodigoLibre(ocupados, desde, hasta)` vive en el dominio de
accounting. `ocupados` son **todos** los códigos del libro, no solo los hijos del padre,
porque la clave es libro más código. Si el rango se llena, da un error de dominio (422). Tiene
tests unitarios.

### 5.7 Errores

Se usan los códigos del filtro existente (`all-exceptions.filter.ts`): 400 para la forma (Zod),
422 para las reglas y 409 `CONFLICT` para la unicidad. No hay códigos nuevos: un reintento
devuelve el resultado guardado, no un error.

## 6. Front

### 6.1 Dónde vive

`web/src/features/onboarding/`:

| Archivo | Qué es |
|---|---|
| `copy.ts` | Texto, sugerencias de categorías y bancos |
| `use-onboarding.ts` | Consultas y mutaciones (TanStack Query) |
| `bienvenida.tsx` | El modal y la máquina de pasos |
| `nimbo-dice.tsx` | Nimbo con su burbuja |
| `pasos/*.tsx` | Un componente por paso |

`bienvenida.tsx` se monta en `Shell` (`routes/__root.tsx`), del lado privado. Pide
`GET /onboarding` una vez y, si `pending`, se abre.

### 6.2 Apertura

- Al abrirse, llama `POST /onboarding/start` sin esperar la respuesta: si se pierde, el modal
  ya está abierto.
- Guarda el `bookId` de `GET /onboarding` y manda todos los pasos con la cabecera `x-libro` de
  ese libro, aunque la persona cambie el libro activo en otra pestaña.
- Si un paso ya tiene resultado en `steps` (por ejemplo, otra pestaña lo hizo), se muestra
  como hecho con lo que creó.

### 6.3 Nimbo y la burbuja

`nimbo-dice.tsx` recibe `gesto` y el texto. Nimbo va a la izquierda y la burbuja a la derecha;
en el teléfono, Nimbo va arriba y más chico.

| Paso | Gesto | Dice (tono de `PRODUCT.md`: directo, sin felicitar de más) |
|---|---|---|
| Intro | `contento` | Quién es y qué va a pasar: cinco pasos, todos salteables |
| Monedas | `neutro` | Si manejás dólares o solo colones |
| Bancos | `neutro` | Cada banco es una cuenta; el extracto se concilia contra ella |
| Saldos | `desconfiado` | Pide el saldo de hoy, tal cual lo dice el banco |
| Categorías | `neutro` | Cada categoría es una cuenta; desmarcá las que no usás |
| Ingreso | `neutro` | Cuánto entra este mes; el reparto se arma en Modelos |
| Cierre | `orgulloso` | Resumen de lo creado y enlace a la guía |

- Los textos definitivos van en `copy.ts` y se revisan en la implementación.
- La burbuja es un `<p>` asociado al título del paso con `aria-describedby`.
- El cambio de gesto usa el parpadeo que ya tiene `bloub.tsx` y respeta
  `prefers-reduced-motion`.

### 6.4 Modal

- Se usa `Dialog` de `components/ui`. En el teléfono ocupa la pantalla entera.
- **Pie:** «Saltear» y «Siguiente». En los pasos con datos, «Siguiente» confirma y llama al
  endpoint. «Atrás» solo navega: no deshace lo confirmado, y el paso confirmado se muestra en
  modo lectura.
- **Cerrar** (Escape, X o fuera del modal) pide confirmación con `AlertDialog`: «Lo que ya
  confirmaste queda. La bienvenida no vuelve a aparecer».
- **Errores:** un error de red deja el paso abierto con «Reintentar». Uno de regla (409 o 422)
  se muestra junto al campo.
- **Foco:** al cambiar de paso, el foco va al título del paso.

### 6.5 Pasos

- **Monedas:** dos opciones, «Solo colones» y «Colones y dólares».
- **Bancos:** chips con las sugerencias (BAC Credomatic, BCR, BN, Promerica, Davivienda, Banco
  Popular) y «Otro» con nombre libre. Cada banco elegido lleva moneda (solo CRC si se eligió
  solo colones). Se puede elegir el mismo banco en las dos monedas.
- **Saldos:** una fila por caja (según las monedas elegidas) y por banco creado. El campo de
  monto acepta negativos solo en bancos.
- **Categorías:** las sugeridas, casi todas marcadas:
  - Gasto: Supermercado, Casa, Servicios, Transporte, Salud, Comidas afuera, Entretenimiento,
    Suscripciones, Educación.
  - Ingreso: Salario, Otros ingresos.

  Abajo, un campo para agregar propias con su tipo.
- **Ingreso:** el mes actual y un monto en colones.
- **Cierre:** resumen de lo creado, con enlaces a Modelos (armar el reparto) y a la guía (el
  botón principal).

### 6.6 Presupuesto de bundle

El modal se carga con `lazy()` solo cuando `pending` es true. El bundle de entrada no crece por
encima del límite de `CONSTRAINTS.md` (115,4 kB).

## 7. Tests

**Api** (vitest, con el contenedor de Postgres de `api/src/test`):

- `siguienteCodigoLibre`:
  - primer libre;
  - huecos;
  - ocupado fuera del padre;
  - rango lleno.
- Cada paso:
  - crea lo esperado;
  - un segundo llamado devuelve el mismo resultado y no escribe;
  - un fallo a la mitad no deja fila ni datos.
- Saldos:
  - sobregiro en un banco;
  - negativo en caja → 422;
  - neto cero;
  - cuenta ajena → 422;
  - cuenta repetida → 400.
- Categorías:
  - duplicado en el pedido y contra existentes → 409;
  - agrupadora que ya existe como cuenta que acepta asientos → 422.
- Marca:
  - `start` dos veces → 204 las dos;
  - `pending` falso para editor o lector;
  - registro con invitación pendiente → marcado;
  - con invitación vencida → no marcado.
- Permisos: un editor recibe 403 en cada POST.
- Guardias existentes: vaciado, borrado, permisos y rastro, en verde sin tocarlos.

**Web** (vitest y Testing Library):

- El modal abre solo con `pending`.
- «Siguiente» llama al endpoint del paso.
- «Saltear» no llama a nada.
- Cerrar pide confirmación.
- Si se eligió solo colones, no se ofrecen dólares.
- Un paso con resultado se muestra en modo lectura.

**Cobertura:** ≥ 80 % de lo nuevo (`CONSTRAINTS.md`).

## 8. Despliegue

1. Migración: la columna, la tabla y la marca de los usuarios existentes.
2. Api y web juntas. Un front viejo ignora `/onboarding`, y una api vieja no existe con el front
   nuevo porque se despliegan a la vez.
3. `check:full` antes del push.

## 9. Novedades

Una entrada en `web/src/features/shell/novedades.md` en la versión que la incluya: «**Bienvenida
para quien empieza**: Nimbo te acompaña a cargar tus bancos, saldos, categorías y el ingreso del
mes».

## 10. Trade-offs aceptados

1. **Ventana del despliegue.** Quien se registre entre la migración y el arranque de la api
   nueva queda con la marca en null y ve la bienvenida una vez. Es inofensivo.
2. **Dos pestañas a la vez** pueden abrir el modal las dos. Los pasos son idempotentes por
   libro, así que no se duplica nada.
3. **«Solo colones» no desactiva las cuentas en dólares.** Solo esconde los dólares en la
   bienvenida. Desactivarlas exigía hacerlo al cerrar, y el cierre no está garantizado (se
   puede cerrar la pestaña), además de chocar con cuentas con saldo o con versión vieja.
4. **Una invitación a un libro que llega después del registro** no evita la bienvenida: para
   entonces la persona ya la vio en su libro propio.
5. **Las cuentas semilla «Banco colones» (1111) y «Banco dólares» (1112)** quedan al lado de las
   que crea el paso Bancos. Se pueden desactivar a mano desde el plan de cuentas.
