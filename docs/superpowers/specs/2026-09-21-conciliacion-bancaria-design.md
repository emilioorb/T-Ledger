# Diseño — Fase 2: importación de extractos y conciliación bancaria

Fecha: 2026-09-21
Estado: aprobado para planificación

## 1. Propósito

La fase 1 responde qué pasó con la plata que Emilio anotó. Esta fase responde otra cosa: **qué
pasó con la plata que el banco vio**. La diferencia entre las dos listas es el trabajo real de
la contabilidad personal, y hoy no hay forma de verla.

Las preguntas que el módulo tiene que responder:

- ¿El saldo contable de mi cuenta de banco coincide con el saldo que dice el banco?
- Si no coincide, ¿qué movimientos explican la diferencia?
- ¿Qué gastó el banco que yo no anoté?
- ¿Qué anoté yo que el banco todavía no muestra?

## 2. Alcance

Importación de extractos en CSV, conciliación contra los movimientos ya registrados, y alta de
movimientos desde las líneas que no tienen contrapartida.

**Fuera de alcance:** sincronización automática con el banco, OFX, XLS, PDF, conciliación de
tarjetas de crédito como cuenta separada, y aprendizaje automático de categorías. El spec de
fase 1 ya descartaba la sincronización automática y esta fase no la reabre.

## 3. Las cuatro decisiones que gobiernan el módulo

**1. El importador no escribe en el libro diario.**
Una línea del banco que se convierte en gasto crea un `Movement`, y el movimiento genera su
asiento por el camino que ya existe. Dar al importador una segunda puerta a la contabilidad
garantizaría que los dos caminos divergieran: distinto redondeo, distinta validación, distinto
tratamiento del período cerrado.

**2. Nada se concilia solo.**
El sistema sugiere con un puntaje y una razón; Emilio confirma. Una conciliación automática
equivocada es peor que ninguna, porque nadie vuelve a revisar lo que el sistema dio por cerrado.

**3. La identidad de una línea es su contenido, no su posición.**
Cada línea lleva un hash de fecha, monto, descripción y referencia, único por cuenta bancaria.
Reimportar el mismo archivo no duplica nada, y dos extractos que se solapan en fechas tampoco.
Depender del nombre del archivo o del orden de las filas sería depender de lo que el banco puede
cambiar sin avisar.

**4. El perfil de importación es dato, no código.**
Qué columna es la fecha, con qué formato, si el monto viene en una columna con signo o en dos de
débito y crédito: todo eso vive en una fila de la base. Un banco nuevo es un perfil nuevo, no un
parser nuevo ni un `if` más en una cadena.

## 4. Modelo de datos

### BankAccount

Ata un extracto a un lugar del plan de cuentas.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | |
| `name` | string | «BAC colones» |
| `accountCode` | string | La cuenta contable, por ejemplo `1111` |
| `currency` | `CRC \| USD` | Debe coincidir con la moneda de las líneas |
| `profileId` | uuid \| null | Perfil por omisión al importar |
| `active` | boolean | |

La cuenta contable tiene que aceptar asientos. Apuntar una cuenta bancaria a una agrupadora
produciría movimientos que no se pueden asentar, y el error aparecería recién al conciliar.

### ImportProfile

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | |
| `name` | string | «BAC CSV» |
| `delimiter` | string | `,` o `;` |
| `encoding` | `utf-8 \| latin1` | Los bancos locales todavía exportan latin1 |
| `headerRows` | int | Filas a descartar antes de los datos |
| `dateColumn` | int | Índice, base 0 |
| `dateFormat` | string | `DD/MM/YYYY`, `YYYY-MM-DD` |
| `descriptionColumn` | int | |
| `referenceColumn` | int \| null | |
| `amountColumn` | int \| null | Monto con signo |
| `debitColumn` | int \| null | Alternativa: dos columnas |
| `creditColumn` | int \| null | |
| `decimalSeparator` | `. \| ,` | |
| `thousandsSeparator` | string \| null | |

Se exige `amountColumn` **o** el par `debitColumn`/`creditColumn`, nunca los tres ni ninguno. Es
la única validación cruzada del perfil y va en el dominio.

### BankStatement y BankLine

El extracto guarda qué archivo se importó, contra qué cuenta, con qué perfil y cuántas líneas
entraron y cuántas se descartaron por duplicadas.

La línea guarda fecha, descripción, referencia, monto (positivo entra, negativo sale), el hash y
su estado: `PENDING | MATCHED | IGNORED`. Cuando queda conciliada, apunta al `movementId` con el
que se cruzó.

`IGNORED` existe para las líneas que no son de Emilio y nunca lo serán: una comisión que ya está
registrada de otra forma, un traslado interno. Sin ese estado, la lista de pendientes acumularía
ruido hasta volverse inútil, que es como mueren las conciliaciones.

## 5. Conciliación

Función pura del dominio: recibe las líneas pendientes y los movimientos del período de esa
cuenta, y devuelve sugerencias. No toca base de datos ni decide nada.

Reglas, en orden de confianza:

| Regla | Condición | Puntaje |
|---|---|---|
| Exacta | Mismo monto, misma fecha | 100 |
| Cercana | Mismo monto, hasta 3 días de diferencia | 80 |
| Por referencia | La referencia del banco aparece en el comprobante del movimiento | 70 |

Un movimiento solo puede sugerirse para una línea, y una línea para un movimiento: se resuelve
tomando primero las de mayor puntaje. Si dos candidatos empatan, se devuelven los dos y la
pantalla lo muestra como ambiguo. Inventar un desempate por orden de inserción sería elegir al
azar y presentarlo como certeza.

**El saldo.** La pantalla muestra el saldo contable de la cuenta a la fecha del extracto, el
saldo del extracto, y la diferencia. Con todo conciliado la diferencia es cero; mientras no lo
esté, es exactamente la suma de lo pendiente. Es la misma regla de la comprobación: la
diferencia siempre a la vista, cuadre o no.

## 6. API

Todo bajo `/api/v1`:

- `GET|POST /bank-accounts`, `GET|PATCH /bank-accounts/:id`
- `GET|POST /import-profiles`, `GET|PATCH /import-profiles/:id`
- `POST /bank-statements` — sube el CSV, devuelve el extracto con sus líneas y cuántas se
  descartaron por duplicadas
- `POST /bank-statements/preview` — lee el archivo con el perfil y devuelve las primeras filas
  sin guardar nada, para verificar el mapeo antes de importar
- `GET /bank-statements`, `GET /bank-statements/:id`
- `GET /reconciliation?bankAccountId=&from=&to=` — líneas pendientes, sugerencias y los tres
  saldos
- `POST /reconciliation/confirm` — `{ lineId, movementId }`
- `POST /bank-lines/:id/unmatch` — deshace una conciliación confirmada
- `POST /bank-lines/:id/to-movement` — crea el movimiento y lo concilia con la línea
- `POST /bank-lines/:id/ignore`

El archivo viaja como `multipart/form-data`. Es el único endpoint del sistema que no recibe
JSON, y la razón es que un CSV de banco en base64 dentro de un JSON solo agrega una codificación
que después hay que deshacer.

## 7. Pantallas

- `/banco/cuentas` — cuentas bancarias y sus perfiles
- `/banco/importar` — subida, vista previa del mapeo, y resultado de la importación
- `/banco/conciliacion` — la vista principal: los tres saldos arriba, las líneas pendientes con
  su sugerencia al lado, y las acciones de confirmar, ignorar o crear movimiento

La vista previa antes de importar no es una cortesía: un perfil mal mapeado mete cien líneas con
la fecha y el monto cambiados de lugar, y deshacer eso cuesta más que revisarlo.

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El CSV real no se parece al perfil | Alto | Vista previa obligatoria antes de importar, y el importador falla con la fila y la columna del problema, no con «formato inválido» |
| Dos movimientos idénticos el mismo día | Medio | Se devuelven las dos sugerencias marcadas como ambiguas, y decide Emilio |
| Un extracto que pisa un período cerrado | Medio | Crear el movimiento pasa por el guardián de período, igual que cualquier otra alta |
| Latin1 leído como UTF-8 | Bajo | La codificación es parte del perfil y la vista previa la delata al instante |

## 9. Fuera de alcance

Sincronización automática, OFX, XLS, PDF, categorización automática, conciliación de tarjetas
como cuenta separada, y reglas de conciliación definidas por el usuario.
