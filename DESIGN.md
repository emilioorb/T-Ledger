<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Finanzas
description: Sistema financiero personal con contabilidad de partida doble. Monocromo, denso, oscuro por defecto.
---

# Design System: Finanzas

## 1. Overview

**Creative North Star: "La cinta de la sumadora"**

El papel continuo que escupe una sumadora: una columna de cifras, en una sola tinta, en una sola familia tipográfica, cada una en su renglón y cada una rastreable hasta la anterior. Sin adorno, porque el adorno nunca fue parte del aparato. La cinta no decide qué número es importante con color; lo decide el orden y el peso de la tinta.

De ahí sale todo el sistema. No hay color de marca: la jerarquía se construye con luminancia, peso tipográfico y espacio, y el único color que aparece en la interfaz es semántico — un signo negativo, un estado que exige atención. Esa restricción no es ascetismo, es economía: en una pantalla donde el color no significa nada la mayor parte del tiempo, el color que sí significa algo se ve al instante.

La densidad gana sobre el aire. Más filas por pantalla, menos desplazamiento, cero ruido. Lo que tranquiliza no es el espacio en blanco sino la ausencia de cosas que no aportan. El sistema rechaza explícitamente el vocabulario del rubro: nada de azul marino con dorado, nada de tarjetas de métricas, nada de ilustraciones amables, nada de gris sobre gris indiferenciado.

**Key Characteristics:**

- Monocromo por doctrina. El color es semántico o no está.
- Oscuro por defecto, claro completo. Ninguno es la versión degradada del otro.
- Denso: la unidad de medida es la fila, no la tarjeta.
- Cifras en mono tabular, siempre alineadas a la derecha.
- Plano en reposo. La profundidad viene del tono, no de la sombra.

## 2. Colors

Una paleta sin paleta. Neutros tintados en toda la escala de luminancia, y un puñado de colores semánticos que aparecen poco y por eso se ven.

### Primary

No hay color primario. **Esa es la decisión, no una omisión.** El rol que en otros sistemas cumple el acento —dirigir la mirada— lo cumplen acá el peso tipográfico, el tamaño y el espacio.

Donde un sistema convencional pintaría el botón principal de color, este lo resuelve con contraste de luminancia: la superficie más clara del tema oscuro, o la más oscura del tema claro.

### Neutral

La escala completa, tintada. **El tinte es la marca**, porque es lo único cromático que aparece en reposo.

- **Tinte cálido, no frío.** Matiz OKLCH en la zona de 60–80, croma entre 0,005 y 0,01. Un near-black cálido se distingue de inmediato del azul oscuro que todo tablero financiero usa por reflejo, que es exactamente la anti-referencia declarada.
- Nunca `#000` ni `#fff`. Los extremos de la escala son un near-black y un near-white tintados.
- El croma baja conforme la luminancia se acerca a 0 o a 100: croma alto en los extremos se ve sucio.
- Pasos necesarios: fondo, superficie, superficie elevada, borde sutil, borde, texto atenuado, texto secundario, texto principal.

| Paso | Oscuro | Claro |
|---|---|---|
| Fondo | `oklch(0.155 0.006 65)` · `#0e0c0a` | `oklch(0.988 0.004 75)` · `#fdfbf8` |
| Superficie | `oklch(0.195 0.007 65)` · `#171412` | `oklch(0.962 0.005 75)` · `#f4f2ef` |
| Superficie elevada | `oklch(0.235 0.008 65)` · `#211d1a` | `oklch(0.930 0.006 75)` · `#eae7e3` |
| Borde sutil | `oklch(0.285 0.008 65)` · `#2d2926` | `oklch(0.895 0.007 75)` · `#dfdcd7` |
| Borde | `oklch(0.560 0.011 65)` · `#79736e` | `oklch(0.560 0.013 75)` · `#79746c` |
| Texto atenuado | `oklch(0.660 0.011 65)` · `#97918b` | `oklch(0.500 0.014 65)` · `#69625b` |
| Texto secundario | `oklch(0.800 0.008 65)` · `#c1bdb8` | `oklch(0.400 0.014 65)` · `#4d4640` |
| Texto principal | `oklch(0.955 0.005 65)` · `#f3efed` | `oklch(0.215 0.010 65)` · `#1d1915` |

El matiz es 65 en el tema oscuro y 75 en las superficies del claro: un near-black y un near-white cálidos, lejos del azul oscuro de todo tablero financiero. El croma cae a 0,004–0,008 en los extremos de luminancia y sube apenas en el medio, donde no ensucia.

El borde llega a 3,92:1 sobre la superficie en oscuro y 4,17:1 en claro, porque es lo que identifica un control (WCAG 1.4.11, mínimo 3:1). El borde sutil es decorativo —1,27:1 y 1,23:1— y nunca es lo único que identifica algo.

### Semantic

Los únicos colores del sistema. Aparecen en menos del 5 % de cualquier pantalla.

- **Negativo** — saldos en contra, meses que no cierran, cubetas pasadas, asientos descuadrados.
- **Positivo** — metas alcanzadas, períodos que cuadran, excedente disponible.
- **Advertencia** — tasa desactualizada, movimiento sin contabilizar, período que no se puede cerrar.

| Rol | Oscuro | Claro |
|---|---|---|
| Negativo | `oklch(0.705 0.165 25)` · `#f6706a` | `oklch(0.480 0.185 25)` · `#ae1320` |
| Positivo | `oklch(0.760 0.110 165)` · `#66c7a0` | `oklch(0.470 0.095 165)` · `#0c6b4d` |
| Advertencia | `oklch(0.780 0.166 65)` · `#fe9e24` | `oklch(0.400 0.090 65)` · `#683c00` |

Contraste medido contra fondo, superficie y superficie elevada de su propio tema:

| Rol | Oscuro (fondo / superficie / elevada) | Claro (fondo / superficie / elevada) |
|---|---|---|
| Negativo | 6,93 / 6,49 / 5,92 | 6,96 / 6,45 / 5,86 |
| Positivo | 9,55 / 8,94 / 8,15 | 6,27 / 5,81 / 5,28 |
| Advertencia | 9,42 / 8,82 / 8,04 | 3,24 / 3,00 / 2,72 |

**La advertencia es naranja, y la separación con el negativo la hace la luminancia.** El naranja comparte familia de matiz con el rojo del negativo, así que para quien no distingue rojo de verde el matiz no alcanza: por eso los dos roles se separan además por claridad —en oscuro 0,78 contra 0,705; en claro 0,65 contra 0,48— y nunca aparecen solos, porque rige la Regla del Signo. El positivo tira a verde azulado para no caer en el verde de terminal, que la sección 6 prohíbe.

En claro, la advertencia se fijó en 0,65 y no en el 0,40 que alcanzaba 4,5:1 como texto: el mismo token pinta las barras de progreso, donde el color es el dato y el requisito aplicable es 3:1 (WCAG 1.4.11). Con 0,40 el aviso no se distinguía del neutro mientras una cubeta al lado se veía viva. La contrapartida está aceptada a conciencia: una **cifra** en ámbar sobre claro queda en ~3:1 y no en 4,5:1, y lo que la sostiene es la Regla del Signo —ningún dato viaja solo en el color—.

La prohibición del dorado y el ámbar de la sección 6 sigue en pie y es sobre el color decorativo: el naranja acá no es identidad ni adorno, es un rol semántico con un significado verificable.

Ninguno de los tres se usa solo: rige la Regla del Signo.

### Named Rules

**La Regla del Monocromo.** Si un color no significa algo verificable, no va. No existe el color decorativo, el color de marca ni el color de categoría. Un elemento se destaca por peso, tamaño o posición; si ninguna de las tres alcanza, el problema es la composición, no la falta de color.

**La Regla del Signo.** Ningún dato se comunica solo con color. Un monto negativo lleva signo; un estado lleva etiqueta; una fila en alerta lleva algo más que un tinte. En contabilidad el signo *es* el dato, y delegarlo al color lo pierde para quien no lo distingue.

## 3. Typography

**Display Font:** la misma sans de interfaz en su peso y tamaño mayores. No hay familia de titulares aparte: un producto sin pantallas de marketing no necesita una voz de titular.

**Body Font:** sans técnica, neutra y compacta. Apretada de ancho, de formas cerradas, pensada para interfaz densa antes que para texto corrido.

**Label/Mono Font:** mono para **toda cifra**: montos, códigos de cuenta, fechas, porcentajes, identificadores.

**Interfaz:** **Geist Sans**. Grotesca técnica, de ancho apretado y formas cerradas, dibujada para interfaz densa. No es Inter ni Roboto ni una del sistema.

**Cifras:** **Geist Mono**. El `1` lleva bandera y barra de base, y la `l` lleva cola: `1101` y `1l01` se distinguen de un vistazo, que es lo que exige la Regla del Código.

Las dos son OFL y se sirven desde Fontsource, no desde un CDN externo. Comparten esqueleto, así que una cifra en mono al lado de una etiqueta en sans no se lee como un injerto.

**Character:** dos familias, una función cada una. La sans dice qué es cada cosa; la mono dice cuánto. Esa división es lo que permite escanear una columna de montos sin leerla: las cifras se distinguen del texto antes de enfocarlas.

### Hierarchy

- **Display** (peso alto, el escalón mayor): título de pantalla. Una sola por vista.
- **Headline**: encabezado de sección dentro de una vista.
- **Title**: encabezado de bloque, nombre de cuenta, nombre de meta.
- **Body** (peso regular): texto de interfaz, descripciones, copy de estados vacíos. Máximo 65–75 caracteres por línea donde haya texto corrido.
- **Label** (peso medio, tamaño menor, algo de tracking): encabezados de columna, etiquetas de campo, texto de insignia.
- **Numeric** (mono, cifras tabulares): toda cantidad. Alineada a la derecha, siempre.

Contraste de escala de 1,25 como mínimo entre escalones. Una escala plana no es jerarquía.

### Named Rules

**La Regla de la Cifra Tabular.** Todo número va en mono con `font-variant-numeric: tabular-nums`. Sin excepción, incluidos los que aparecen sueltos dentro de una frase. Una columna de montos que no alinea obliga a leer cada fila; una que alinea se escanea.

**La Regla del Código.** Los códigos de cuenta son cifras, no texto: van en mono. Un `1101` tiene que distinguirse de un `1l01` sin esfuerzo.

## 4. Elevation

Plano en reposo. La profundidad se comunica con **tono**, no con sombra: una superficie elevada es un escalón más claro de la escala neutra en el tema oscuro, y un escalón más oscuro en el claro. No hay sombras decorativas en ningún componente.

La sombra existe solo donde hay una capa real por encima del documento —menú, diálogo, tooltip—, y ahí es estructural: dice «esto flota sobre lo otro», no «esto es bonito».

El movimiento acompaña ese criterio: cambios de estado, transiciones entre vistas y confirmaciones que se sienten, pero sin entradas escalonadas ni secuencias al desplazar. Curvas exponenciales de salida (`ease-out-quart`, `quint`, `expo`); nada de rebote ni elástico; nunca se animan propiedades de layout.

### Named Rules

**La Regla del Tono sobre la Sombra.** Si algo necesita verse por encima de otra cosa, sube un escalón de la escala neutra. La sombra se reserva para lo que realmente flota, y en la mayoría de las pantallas eso no existe.

## 5. Components

`[sin componentes todavía: el proyecto está pre-implementación. Se documentan en la próxima pasada de /impeccable document, una vez que exista código.]`

Lo que ya está decidido y condiciona el catálogo: **todos los componentes salen de shadcn/ui**. Si shadcn tiene el componente, no se escribe a mano.

Los tokens de shadcn se reemplazan por los de este documento; sus grises por defecto son el punto de partida, no el resultado.

### Named Rules

**La Regla del Gráfico.** Todo gráfico, sin excepción, usa el componente `chart` de shadcn —`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`—. Nunca se importa nada de Recharts directamente, aunque shadcn lo tenga debajo. El envoltorio es lo que aporta los tokens del tema y el tooltip accesible; saltárselo devuelve un gráfico con los colores por defecto de Recharts, que son exactamente lo que este sistema prohíbe.

Como el sistema es monocromo, una serie se distingue de otra por **luminancia, trazo y forma del marcador**, no por color. Una sola serie es el caso normal. Todo gráfico va acompañado de la cifra exacta: quien no puede leer el gráfico tiene el dato al lado.

## 6. Do's and Don'ts

### Do

- **Construir la app entera con shadcn/ui.** Botones, tablas, formularios, diálogos, pestañas, insignias, esqueletos de carga, toasts y gráficos. Si shadcn tiene el componente, es ese. Escribir uno a mano solo cuando shadcn no lo tenga, y entonces construirlo con las mismas primitivas y los mismos tokens.
- Usar la densidad como recurso: más filas por pantalla, menos desplazamiento.
- Construir jerarquía con peso, tamaño y espacio antes que con cualquier otra cosa.
- Alinear toda cifra a la derecha, en mono tabular.
- Acompañar cada color semántico con un signo, una etiqueta o un ícono.
- Variar el espaciado según la importancia. El mismo `padding` en todos lados es monotonía, no sistema.
- Dar a cada uno de los cuatro modos —registrar, decidir, chequear, cuadrar— una cara reconocible.
- Ofrecer siempre el camino de un número a lo que lo compone.

### Don't

- **Nada de dorado**, ni ámbar, mostaza o bronce como color decorativo o de identidad: es el reflejo del rubro. El naranja de advertencia es la única excepción, y solo con su significado semántico.
- **Nada de azul marino ni de tablero azul oscuro.** Mismo reflejo, un paso más adelante.
- **Nada de terminal verde sobre negro.** Es el reflejo de segundo orden, el que aparece al evitar el primero.
- Nada de color decorativo ni de categoría. Si no significa algo verificable, no va.
- Nada de fila de tarjetas de métricas arriba de la pantalla.
- Nada de barra lateral gris con quince ítems planos.
- Nada de tarjetas anidadas. Y tarjeta suelta solo cuando sea de verdad el mejor recurso.
- Nada de texto con degradado, glassmorphism decorativo ni bordes laterales de color como acento.
- Nada de gris sobre gris indiferenciado: denso no es lo mismo que plano de jerarquía.
- Nada de ilustraciones amables, gamificación ni tono celebratorio. La única celebración admitida es una meta alcanzada, una vez y con mesura.
- Nada de rayas largas en el copy.
- Nada de tablas idénticas repetidas en ocho vistas. Si se parece a una hoja de cálculo, está mal.
