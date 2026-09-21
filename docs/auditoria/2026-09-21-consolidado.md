# Auditoría consolidada — 21 de setiembre de 2026

Once auditorías sobre Tape, agrupadas en fases por riesgo y retorno. Cada hallazgo cita
`archivo:línea` y sale de una lectura del código o de una medición, no de una checklist.

Las auditorías fueron: jerarquía visual (tres, por grupo de pantallas), layout y componentes
compartidos, animación (criterio de Emil Kowalski), responsive en código, responsive medido en
navegador, SEO y accesibilidad, seguridad y calidad de código, y pruebas adversariales contra la
API.

**Orden de ejecución: de la fase 0 a la 5.** La fase 6 es producto, no deuda, y va al final.

---

## Fase 0 — Integridad de datos ✅ cerrada el 21/09/2026

Lo que hace perder plata o corromper los libros sin que nadie se entere. Cada arreglo lleva su
test: son justamente los caminos que hoy no tienen ninguno.

Los trece puntos quedaron arreglados y con test. Dos decisiones que se apartan de lo que decía
el hallazgo, con su razón:

- **0.8** no se resolvió agregándole saldo inicial a la cuenta bancaria sino cambiando qué se
  compara: `ledgerBalance`/`statementBalance` pasaron a ser `ledgerMovement`/`statementMovement`,
  los dos acotados al rango. Conciliar es preguntar si lo que se anotó en el mes coincide con lo
  que el banco reportó en el mes; un saldo inicial que nadie tiene no hace falta para eso.
- **0.11**, separador de miles: se rechaza que sea igual al decimal, que es lo que multiplica los
  montos por cien. No se rechaza que coincida con el delimitador de columnas: el parser respeta
  las comillas, así que `"1,234.56"` en un CSV separado por comas es válido y frecuente.

### 0.1 ✅ Renombrar borra datos

`.partial()` de Zod v4 **sigue aplicando los `.default()`**, así que la clave ausente llega como
`null` y la comprobación `input.campo === undefined` del caso de uso nunca la ve.

| Recurso | Qué se pierde | Archivo |
|---|---|---|
| Meta | `accountCode` → `null`: deja de aceptar aportes | `goals/infrastructure/goals.schemas.ts:19-21` |
| Inversión | `accountCode` y `maturesAt` → `null` | `investments/infrastructure/investments.schemas.ts:24-26` |
| Cuenta | `parentCode` → `null` → 422: **renombrar o desactivar una cuenta hoja es imposible** | `accounting/infrastructure/accounting.schemas.ts:28-31` |

Renombrar «Europa» desde la interfaz la rompe. Es el más grave porque se dispara con la operación
más inocente que hay.

### 0.2 ✅ El parser de CSV se traga transacciones en silencio

`banking/domain/csv.ts:30-31`: cualquier `"` abre modo citado, esté donde esté, y no hay chequeo
de comilla sin cerrar al final. Una descripción con pulgadas —`TV 22" LED`— concatena todo hasta
la siguiente comilla en una celda. La fila resultante tiene el número correcto de columnas, fecha
válida y monto válido: **pasa todas las validaciones**. Las filas del medio desaparecen sin error.

Arreglo: la comilla solo abre modo citado como primer carácter de celda vacía; error si el archivo
termina con `quoted === true`. Devolver `Result<string[][], RangeError>` para nombrar la fila.

### 0.3 ✅ Conciliar contra un movimiento que no existe

`banking/application/match-line.use-case.ts:14-26` no verifica que el movimiento exista, ni el
monto, ni la cuenta. `POST /bank-lines/:id/match` con un UUID de ceros responde **200**: la línea
queda `MATCHED`, sale del pendiente y la diferencia «cierra» contra la nada.

### 0.4 ✅ Un 422 deja el movimiento guardado sin asiento

`accounting/application/create-movement.use-case.ts:42-45` guarda antes de asentar, sin
transacción. Con una cuenta de pago inexistente: 422 al usuario, movimiento en la base con
`posted: false`. Efecto medido: bloquea el cierre del mes con un mensaje que además miente
(«Asignales una categoría con cuenta contable» cuando la categoría estaba bien).

### 0.5 ✅ `POST /accounts` sobrescribe una cuenta existente

`accounting/application/save-account.use-case.ts:18-20` no comprueba si el código existe y `save`
es un upsert. Crear `1101` de nuevo responde **201 Created** y renombra «Caja colones» en el plan
y en toda la comprobación.

### 0.6 ✅ Monto sin tope rompe el patrimonio para siempre

`moneySchema` acepta cualquier entero. Un asiento con `9223372036854775807` entra con 201, y a
partir de ahí `GET /reports/net-worth` responde **500 permanente**, porque
`SUM(l."amountMinor")::bigint` desborda int8 en `accounting/infrastructure/prisma-journal.repository.ts:136`.
Como no existe `DELETE /journal-entries`, no hay forma de deshacerlo por API.

### 0.7 ✅ Fechas imposibles se corren en silencio

`Date.UTC` normaliza el desborde y nadie valida el ida y vuelta.

- `2026-02-30` → se guarda `2026-03-02` (201). `2026-02-29` → `2026-03-01`.
- CSV `31/02/2026` → línea con fecha `2026-03-03`.
- Aporte con `1990-01-01` → 201.

Daño medido: crearon los períodos fantasma `1990-01`, `2020-01`, `2026-03` y `9999-12`, y
**rompieron la cadena de cierre** (2026-08 pasó de `blockers: []` a `PREVIOUS_PERIOD_OPEN`).

`banking/domain/statement-parsing.ts:14` y `:19`, más los helpers `utc()` de cada caso de uso.

Además es el detector natural de «el archivo viene en mm/dd y el perfil dice DD/MM»: hoy
`02/14/2026` se importa como 2 de febrero sin chistar.

### 0.8 ✅ La diferencia de conciliación solo da cero el primer mes

`banking/application/reconcile.use-case.ts:61` compara `totalsUpTo(currency, range.to)` —acumulado
desde el inicio de los tiempos— contra la suma del extracto **acotada al rango** (`:72-75`).
`BankAccount` no tiene saldo inicial, así que nada compensa el desfase: conciliar octubre con todo
perfecto da como diferencia el saldo de septiembre. El único test corre sobre una base recién
creada, el único caso donde no se manifiesta.

### 0.9 ✅ La proyección de inversiones inventa interés

`investments/domain/investment.ts:90-113` (`valueAt`) suma **todos** los aportes sin filtrar por
fecha, mientras `investedAt` (`:120-125`) sí filtra. Reproducible sobre datos reales: el
certificado el día que se abrió muestra ₡500.000 de interés ganado.

### 0.10 ✅ Seis operaciones que escriben dos veces sin transacción

| Archivo:línea | Qué queda si falla la segunda escritura |
|---|---|
| `goals/application/manage-goals.use-case.ts:94-104` | Asiento huérfano: los libros dicen que ahorraste, la meta no |
| `investments/application/manage-investments.use-case.ts:110-120` | Ídem con capital |
| `accounting/application/create-movement.use-case.ts:45-46` | Ver 0.4 |
| `accounting/application/update-movement.use-case.ts:53-55` | Movimiento sin asiento + reversión huérfana |
| `accounting/application/void-movement.use-case.ts:24-25` | Movimiento anulado con sus asientos vivos |
| `banking/application/line-to-movement.use-case.ts:37-47` | **La línea queda pendiente: reconciliar otra vez duplica movimiento y asiento** |

El último es el peor: es el único donde reintentar es el flujo normal del usuario.

Arreglo: `withTransaction(fn)` en los puertos sobre `prisma.$transaction`. El patrón ya existe en
`prisma-bank-statement.repository.ts:62`.

### 0.11 ✅ Validaciones que faltan

- Ingreso mensual negativo aceptado con 200 — `budget/infrastructure/budget.schemas.ts:36-38`.
- Separador de miles igual al decimal multiplica los montos por 100 — `statement-parsing.ts:29-32`.
  `"1,234,56"` → ₡123.456,00. Falta guarda en `ImportProfile.create`.
- Celda de monto vacía se importa como ₡0 en vez de fallar — `statement-parsing.ts:27`.
- Referencias colgadas aceptadas: `accountCode` de metas, `accountCodes` de cubetas,
  `budgetBucket` de deudas, `movementId` de conciliación.
- Sin límites: monto, largo de descripción, cantidad de líneas por asiento, `termMonths`
  (una deuda a 100.000 meses devuelve 23,6 MB en 14,5 s), tasa.
- `FileInterceptor` sin `limits` — `banking/infrastructure/bank-statements.controller.ts:63`.

### 0.12 ✅ Tests que faltan donde más duele

- `accounting/application/update-movement.use-case.ts` — **cero specs**. Es el único con doble
  `assertOpen` y el que revierte y re-emite asientos.
- `accounting/application/period-guard.ts` — 21 líneas que son la única defensa contra escribir en
  un mes cerrado, sin spec propio.
- `save-account.use-case.ts` — colgarle una hija a una cuenta con asientos la vuelve no-posteable
  y le deja saldo dentro de una agrupadora. Corrupción silenciosa del plan, sin red.

### 0.13 ✅ Rendimiento que rompe

- N+1 en patrimonio: `accounting/infrastructure/bccr-valuation-rate.adapter.ts:34-39` dispara una
  consulta por cada fecha con asientos de toda la historia. Con tres años, ~2.000 por request. Es
  el endpoint del dashboard.
- Conciliación O(P²) y truncamiento silencioso a 1.000 movimientos —
  `banking/application/reconcile.use-case.ts:38,62` y `banking/domain/reconciliation.ts:80`.

---

## Fase 1 — Interfaz transversal ✅ cerrada el 21/09/2026

Un arreglo, muchas pantallas. Ordenado por pantallas curadas.

Los nueve puntos quedaron cerrados. Tres notas de lo que se apartó del hallazgo:

- **1.3**, primera mitad: medido en el navegador, colapsar la barra **sí** devuelve el espacio.
  A 1024 px la barra pasa de 256 a 64 px y el contenido de 760 a 944. La medición original
  probablemente cayó dentro de los 200 ms de la transición. La segunda mitad sí era real y se
  arregló: en el teléfono la barra tapaba el botón que la abrió y la única salida era acertarle
  al overlay; ahora el panel trae su botón de cerrar.
- **1.5**, árbol de cuentas: se queda con el borde por fila en vez de `divide-y`. El árbol marca
  la raíz con una línea más fuerte y el selector de `divide-y` le gana en especificidad al color
  de la fila. El borde colgando ya estaba resuelto con `[&>li:last-child]:border-b-0`.
- **1.9**: en vez de agrandar un área invisible, crece la caja del botón y solo en punteros
  gruesos (`pointer-coarse`). Un área invisible de 44 px sobre botones de 24 px se solapa con el
  vecino de la misma fila y le roba el toque: en Movimientos, Editar y Anular están pegados.

### 1.1 ✅ `TableFrame` recorta en vez de desplazar

`components/table-frame.tsx:20` usa `overflow-hidden`. Es el mismo elemento detrás de los recortes
medidos en Proyección (163 px), Cuentas bancarias (216 px), Cierre (46 px), Asientos (73 px),
Mayor (57 px) y Plan de pago (15 px). **Cero scroll horizontal en las 126 mediciones** significa
que nada de eso se puede alcanzar. Un `overflow-x-auto` convierte cuatro «rompe» en «molesta».

### 1.2 ✅ `DialogContent` sin altura máxima

`components/ui/dialog.tsx:56` es `fixed top-1/2 -translate-y-1/2` sin `max-h` ni `overflow-y-auto`.
Medido a 360×740: «Asiento manual» mide 942 px y «Nuevo perfil» 1068 px; se parten arriba y abajo,
**sin ningún ancestro desplazable**, y los botones de guardar quedan inalcanzables. «Nueva
inversión» mide 736 px: pasa por 4 px.

Arreglo: `max-h-[calc(100svh-2rem)] overflow-y-auto`.

### 1.3 ✅ Colapsar la barra lateral no devuelve espacio

El botón cambia `data-state` a `collapsed` pero `[data-slot="sidebar"]` sigue midiendo 256 px: el
contenido pasa de 504 a 496 px. A 768 y 1024, que es donde falta espacio, el recurso obvio no
funciona. Además, a 360 el botón del encabezado no cierra la barra (el overlay se come el clic).

### 1.4 ✅ `StatGrid` salta de 2 a 4 columnas y recorta las cifras

`features/accounting/stat-card.tsx:35`. A 1024 px cada tarjeta deja 137 px de interior para montos
de ~185 px, y `Card` tiene `overflow-hidden`: **la cifra se corta sin scroll ni aviso**. Afecta a
Patrimonio, Comprobación, Conciliación, detalle de meta y detalle de inversión.

Arreglo: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` y revisar los `sm:col-span-2`.

### 1.5 ✅ `border-b` por fila (nueve lugares)

Deja una línea colgando al final de cada bloque: `amortization-table.tsx:72,117`,
`extra-payment-simulator.tsx:139,147,155,161`, `deudas.$debtId.index.tsx:14`,
`presupuesto.modelos.tsx:136`, `contabilidad.movimientos.tsx:153`, `metas.$goalId.tsx:254`,
`inversiones.$investmentId.tsx:245`, `shortcuts-sheet.tsx:22,68`, `accounts-tree.tsx:35`
(parcheado con `[&>li:last-child]:border-b-0`).

Arreglo: `divide-y divide-border` en el contenedor.

### 1.6 ✅ Dos tablas sin `TableFrame`

`features/debts/amortization-table.tsx:72` (la única `<Table>` del repo sin marco) y la lista móvil
de `contabilidad.movimientos.tsx:384`.

### 1.7 ✅ La barra de progreso está reimplementada cuatro veces

`index.tsx:127`, `presupuesto.index.tsx:71`, `metas.index.tsx:272`, `inversiones.index.tsx:350`.
La del panel perdió `role="img"` y `aria-label`. Extraer a un componente con etiqueta obligatoria.

### 1.8 ✅ Cifras fuera de escala y sin `Amount`

- `text-lg` en cifras (no existe en la escala): `contabilidad.patrimonio.tsx:111,113,119`,
  `inversiones.$investmentId.tsx:163`.
- La feature deudas es la única que no usa `Amount`: llama `formatMoney` a mano en ocho puntos
  (`amortization-table.tsx:89-94,129-135`, `extra-payment-simulator.tsx:144,163,168`,
  `debt-list.tsx:49,51,60`).
- `journal-entry-form.tsx:224-235` imprime el descuadre sin `num`, justo donde más importa.

### 1.9 ✅ Áreas táctiles por debajo de 32 px en toda la app

Botones primarios 28 px, botones de fila 24 px, X de modal 16×16, plegar árbol 18×18, tabs 25 px,
enlaces inline 16 px. Es una decisión en las variantes de `ui/button.tsx:28`, no 21 arreglos.
Las primarias que sí urgen: Confirmar y A movimiento en conciliación, Cerrar/Reabrir en cierre, y
Editar/Anular en movimientos, que en móvil son las únicas acciones disponibles.

---

## Fase 2 — Responsive ✅ cerrada el 21/09/2026

Los cuatro puntos quedaron cerrados por la raíz: **el contenedor de las pantallas es
`@container`** y las filas miden su propio ancho con `@sm:`, `@2xl:`, `@3xl:` y `@4xl:` en vez
del de la ventana. Correr los breakpoints un escalón hacia arriba habría arreglado 768 px y roto
1280 con la barra colapsada, donde el espacio sí está.

Medición final: **54 combinaciones limpias de 54** (nueve pantallas por 360, 414, 768, 1024, 1280
y 1440). Cero elementos fuera del viewport, cero montos desbordados, cero scroll lateral de
página.


### 2.1 ✅ El acantilado de 768 px

**A 768 px la app tiene menos ancho útil que a 640.** La barra lateral ocupa 256 px desde `md`, así
que el contenido mide 489 px a 768 y 745 a 1024, mientras los breakpoints de Tailwind miran el
viewport. Todo lo que agrega columnas en `sm:` se enciende justo cuando el espacio se achica.

Regla a aplicar: una fila cuyo mínimo supere ~420 px entra en `lg`, no en `sm`. Afecta a
`proyeccion.tsx:50`, `banco.cuentas.tsx:38,39`, `debt-list.tsx:27`, `plan-de-pago.tsx:28`,
`amortization-table.tsx:71`, `contabilidad.movimientos.tsx:358`.

La alternativa de raíz son container queries (`@container`), que miden el contenedor y no la
ventana.

### 2.2 ✅ Lo que se mide fuera de pantalla

- Proyección a 768: la columna «Queda» termina 115 px fuera del viewport, recortada.
- Cuentas bancarias a 768: el botón «Editar» en x=900 con viewport de 768, invisible e
  inalcanzable.
- Conciliación a 1024: «ADOBE SUBSCRIPTION» comprimido a 23 px de ancho.
- Comprobación: ningún ancho quedó limpio; los montos largos desbordan la tarjeta en los seis.
- Plan de cuentas a 360: 17 nombres aplastados; «Traslados entre monedas» en 42 px.

### 2.3 ✅ Pistas fijas en vez de `minmax(0, …)`

`banco.cuentas.tsx` (14rem), `banco.conciliacion.tsx` (22rem) y `cierre.tsx` (9rem) usan anchos
duros. `debt-list.tsx:27` y `plan-de-pago.tsx:28` ya usan `minmax(0,…)`: ese es el patrón a
propagar en las pistas de texto (las de monto sí quedan fijas).

### 2.4 ✅ Los montos son indivisibles

`lib/money.ts:10` usa U+202F como separador de miles, así que ningún monto se parte nunca: cada uno
es un bloque de ~110 px (`text-sm`), ~185 px (`text-2xl`) o ~230 px (`text-3xl`). Conviene
documentarlo como constante de diseño: ninguna pista que aloje un `Amount` puede medir menos.

---

## Fase 3 — Jerarquía y consistencia

- **Detalle de deuda** (`deudas.$debtId.index.tsx:50-59`): seis datos en `text-sm`, ninguna cifra
  abre la pantalla. Es la única que no usa `StatCard`. Además rótulos en versalitas —el único
  `uppercase` del repo— y `num num-right` aplicado a nombres propios.
- **Proyección** (`proyeccion.tsx:199,203,207`): la cifra principal en `text-2xl` y rotulada
  «Horizonte», la misma cadena del filtro de arriba.
- **Mayor** (`contabilidad.mayor.tsx:113,177`): saldos en `text-xl`, empatados con el `h1`, y es la
  única pantalla que mete sus cifras dentro del marco en vez de un `StatGrid`.
- **Patrimonio vs. Situación**: la misma ecuación `A = B + C` con dos contenedores distintos
  (`Card` cruda vs. `StatCard`) y dos tamaños distintos, ninguno en la escala.
- **Formularios de deuda**: los únicos que editan en página completa en vez de `FormDialog`, con
  pie sin `justify-end`, botones sin `size="sm"` y tres columnas donde el resto usa dos.
- **Cierre** (`contabilidad.cierre.tsx:45`): última columna `auto` con encabezado vacío y botón en
  la fila; el encabezado y las filas no coinciden en el borde derecho.
- **Resultados** (`contabilidad.resultados.tsx:29,113`): título de sección al tamaño del cuerpo con
  su total más grande al lado, y el único `border-t-2` del repo.
- **Categorías** (`contabilidad.categorias.tsx:307`): la tabla de mapeadas no tiene encabezado
  mientras la de sin cuenta sí; si no hay ninguna sin cuenta, la pantalla abre con una tabla
  anónima.
- **Copy literal en el JSX**: `not-found.tsx` entero, `__root.tsx:33`, `nav-main.tsx:53`,
  `search-input.tsx:31`, `sort-button.tsx:25,31`, `index.tsx:641`, `presupuesto.modelos.tsx:142`,
  `banco.cuentas.tsx:335-336`.
- **Esqueletos de carga**: siete alturas distintas, ninguno dentro de un `TableFrame`, así que al
  cargar la página salta.
- **`ControlBar`**: las once invocaciones pasan `separated={false}`; la rama `true` es código
  muerto que invita a reintroducir la línea suelta.

---

## Fase 4 — Accesibilidad y arranque

- **Un solo `<title>` para 28 rutas.** TanStack Router ya exporta `HeadContent` y acepta `head:`
  por ruta; el título exacto de cada pantalla ya está en su `copy.ts`.
- **`<header>` y `<footer>` viven dentro de `<main>`** (`__root.tsx:31-71`, porque `SidebarInset`
  renderiza `<main>`): pierden los roles `banner` y `contentinfo`.
- **La barra lateral no es un landmark de navegación**: ~20 enlaces fuera de cualquier `<nav>`.
- **Sin `aria-current`** en los enlaces activos (`nav-main.tsx:40,61`).
- **El foco no se mueve al cambiar de ruta** y no hay enlace de «saltar al contenido»: cada Tab
  recorre 20 enlaces antes de llegar al contenido.
- **Dos saltos `h1 → h3`**: `contabilidad.asientos.tsx:61` y `presupuesto.index.tsx:50`.
- **Las pantallas en carga y en error se quedan sin `h1`**; `ErrorState` emite un `h2` donde
  debería haber un `h1`.
- **Textos en inglés en los primitivos**: `ui/sidebar.tsx:196-197` («Sidebar», «Displays the mobile
  sidebar») es lo primero que se anuncia al abrir la barra en móvil; también `ui/breadcrumb.tsx:9`
  y `ui/sheet.tsx:80`.
- **`growth-chart.tsx:36`** es el único de los cuatro gráficos sin `role="img"` ni `aria-label`.
- **`aria-busy` sin `role="status"`** en cuatro estados de carga.
- **Recharts en el arranque**: abrir `/` cuesta ~219 kB gzip, casi la mitad por dos gráficos que el
  panel importa estáticamente. `React.lazy` con el `Skeleton` que ya existe.
- **`receiptUrl` sin allowlist de protocolo** (`accounting.schemas.ts:64`): hoy no se renderiza
  como enlace, así que no es explotable, pero el campo se llama «Comprobante» y el día que se
  muestre es XSS almacenado. La validación va en el backend.

---

## Fase 5 — Animación

Criterio: lo que se ve cientos de veces al día no se anima; las acciones de teclado tampoco.

- **`transition-all`** en `ui/button.tsx:9`, `ui/tabs.tsx:65`, `ui/badge.tsx:7` y
  `ui/sidebar.tsx:289`: animan `width` y `padding`, o sea layout.
- **`transition-colors` no incluye `box-shadow`**, y el `ring-3` de Tailwind v4 es `box-shadow`: el
  anillo de foco salta mientras el borde se desvanece. En `ui/input.tsx:10`, `ui/select.tsx:46`,
  `ui/calendar.tsx:40`, `ui/dialog.tsx:65` y `report-controls.tsx:156`. Ya lo habíamos
  diagnosticado y arreglado solo en `presupuesto.modelos.tsx`.
- **El sidebar anima `width` y `left` con `ease-linear`** (`ui/sidebar.tsx:218,230`) y se alterna
  con `Cmd/Ctrl+B`: acción de teclado, no debería animar, y menos con propiedades de layout.
- **El modal dura 100 ms** (`ui/dialog.tsx:56`) con `backdrop-blur` animado: la escala de 95→100 no
  se llega a leer y el blur recompone todo el viewport en el frame más caro de la app.
- **El panel de atajos usa `ease-in-out`** en una entrada y se abre con `?`.
- **Duraciones de overlay sin criterio común**: modal 100 ms, dropdown 100, popover 150, tooltip
  150, sheet 200. El modal es el que más debería durar y es de los más cortos.
- **Las curvas del proyecto están declaradas y no se usan**: `--ease-out-quart` aparece una sola
  vez en todo `src/` y `--ease-out-expo` ninguna.
- **Falta feedback al presionar** en: limpiar búsqueda, encabezados ordenables, disclosure del
  árbol de cuentas, checkbox, radio, ítems del sidebar (donde `active:` es el mismo color que
  `hover:`), pestañas y días del calendario.
- **Las barras de progreso saltan** al llegar los datos; con `scaleX` y `origin-left` la transición
  no toca layout.
- **`prefers-reduced-motion` existe** (`styles.css:187-194`) pero le falta
  `animation-iteration-count: 1`: sin eso, `animate-pulse` y `animate-spin` siguen iterando
  infinitas veces por segundo.
- **Reglas muertas**: `ui/tooltip.tsx:44` usa `data-open`, que en Tooltip de Radix no existe.

---

## Fase 6 — Multiusuario con cifrado extremo a extremo

Producto, no deuda. Decidido el 21/09/2026, va después de cerrar las fases 0 a 5.

Individual, en pareja o en familia, con registro y login propios y cifrado extremo a extremo: ni el
dueño del servidor puede ver los datos. Camino elegido: **un solo juego de libros compartido**, no
libros separados con consolidado. El plan de cuentas ya es jerárquico, así que «lo mío / lo tuyo /
lo nuestro» se modela con cuentas sin tocar el esquema contable.

Implicación de arquitectura: el cifrado extremo a extremo es incompatible con calcular la
contabilidad en el servidor. Si el servidor no puede leer los montos, no puede sumar la
comprobación ni paginar en SQL. El cálculo se muda al cliente y el backend pasa a ser almacén de
blobs cifrados. Es viable porque `api/src/modules/*/domain/**` está limpio de Nest, Prisma y HTTP
—el linter lo hace cumplir y no hay una sola violación—, así que ese dominio corre tal cual en el
navegador.

Tres decisiones abiertas: qué pasa si se olvida la contraseña (frase de recuperación o pérdida
total), cómo se comparte la clave del libro con el segundo miembro (sobre cifrado con la clave
pública de cada uno), y qué se pierde al no poder consultar en el servidor (búsqueda, orden y
paginación pasan a ser locales).

Punto de contacto con la fase 0: conviene tenerlo decidido antes de arreglar las seis escrituras
sin transacción, porque con dos personas anotando a la vez la concurrencia deja de ser hipotética.

---

## Lo que está bien y no hay que tocar

1. **El dinero nunca pasa por `Number`** en ningún camino que vuelva a la base: `BigInt` +
   `decimal.js` en el dominio, `BigInt`/`Decimal(9,6)` en el esquema sin un solo `Float`, string en
   el transporte, y el front formatea y parsea enteramente sobre strings. `Money.allocate` reparte
   el residuo unidad por unidad.
2. **La frontera hexagonal la hace cumplir el linter**, no la convención: `api/eslint.config.js`
   restringe los imports dentro de `domain/**` y no hay una sola violación.
3. **Las invariantes contables están en el agregado y bien probadas**: cuadre por moneda, solo
   hojas activas, orden de cierre, reapertura en cascada. Los e2e corren contra Postgres real.
4. **Todo `@Body` y `@Query` pasa por `ZodValidationPipe`** en los 17 controladores, el `$queryRaw`
   es tagged template parametrizado y no hay inyección SQL.
5. **Cero `any`, cero `as unknown as`, cero `!`** en código escrito a mano, con `strict`,
   `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` activos. Ningún test tautológico.
6. **Cero scroll horizontal** en las 126 mediciones de responsive, y Presupuesto, Modelos y
   Resultados quedaron limpias en los seis anchos.
7. **La concurrencia resistió los cuatro ataques**: dos cierres simultáneos, dos activaciones de
   modelo, dos aportes y dos anulaciones dejan el estado consistente.

---

## Higiene pendiente

- **La base quedó sucia** tras las pruebas adversariales: dos asientos con el monto máximo de
  `bigint` mantienen `GET /reports/net-worth` en 500, más 25 asientos `ZZTEST` neutralizados,
  cuatro períodos fantasma y dos aportes de ₡5 en «Europa». Requiere SQL: no hay endpoint de
  borrado para asientos ni contribuciones.
- **`prisma` está en `dependencies`** en vez de `devDependencies` (`api/package.json:29`): es el
  origen de las cuatro vulnerabilidades altas de `npm audit`, ninguna explotable acá.
- **No hay CI**: los quince specs que levantan Postgres corren solo si alguien los ejecuta con
  Docker arriba. El front tiene tres archivos de test.
- **El linter no hace cumplir lo que el repo promete**: el API usa `recommended` y no
  `recommendedTypeChecked`, así que `no-floating-promises` está apagado; el front carga el plugin
  de TypeScript sin activar ninguna de sus reglas.
- **El favicon y el logo son dos marcas distintas**: el favicon dibuja renglones de libro mayor y
  el logo dice «T».
