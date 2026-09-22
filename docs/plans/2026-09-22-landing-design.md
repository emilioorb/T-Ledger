# Diseño: la landing de T-Ledger

Fecha: 2026-09-22 · Estado: aprobado, sin implementar

## Para qué existe

Es una vitrina. Le muestra a un tercero qué es T-Ledger y de qué es capaz, y no
abre registro: quien ya tiene cuenta entra, y quien quiere una escribe. Eso sale
de PRODUCT.md —usuario único, sin registro público— y es la razón por la que la
página no tiene formulario, ni precios, ni lista de espera.

Es además la **primera superficie de marca** del producto. Todo lo demás es
registro *product*: densidad, monocromo, la cinta de la sumadora. Una landing
juega con otras reglas, y la decisión de este diseño es no importar ninguna:
la marca acá es la misma tipografía, el mismo papel y la misma tinta que la app,
puestos en una composición que la app no puede darse.

## La idea

**La página es una cuenta T.** El nombre del producto, el concepto contable que
lo sostiene y la forma de la pantalla son la misma cosa.

Una regla horizontal hace de travesaño y una vertical de pata. A la izquierda,
en castellano, lo que la persona anota; a la derecha, en mono tabular, lo que el
libro escribe solo. Abajo, los totales de los dos lados, iguales, cerrados con
la doble raya de la convención contable.

Se descartaron dos direcciones más:

- **Un solo número** —la pantalla entera es el patrimonio y se desarma en sus
  partes—. Bueno, pero la cifra gigante es el gesto que usa medio fintech, y lo
  que la distinguía había que descubrirlo tocando.
- **La cinta que no para** —el papel continuo con el texto impreso encima—. Es
  el norte creativo del sistema, pero la cinta ya vive en `/entrar`: la landing
  repetiría el gesto en vez de agregar uno, y algo en movimiento detrás del
  texto pelea con el texto.

Bento quedó afuera por ser el reflejo de la categoría: toda landing de producto
de los últimos dos años es una grilla bento, y el encargo era salir de ahí.

## La composición

```
┌────────────────────────────────────────────────────────────────┐
│  T-Ledger                        Solicitar acceso    Entrar →  │
├════════════════════════════════════════════════════════════════┤ travesaño
│                                                                │
│              Vos anotás una cosa. El libro escribe dos.        │
│         Finanzas personales con contabilidad de partida doble. │
│                                                                │
│         DEBE                   │                   HABER       │
│                                │                               │
│           «Gasté 20 mil en el súper»                           │
│    Mercado         ₡20 000,00  │  Efectivo        ₡20 000,00   │
│                                │                               │
│            «Me pagaron el salario»                             │
│    Banco          ₡850 000,00  │  Salario        ₡850 000,00   │
│                                │                               │
│          «Abono 50 mil a la tarjeta»                           │
│    Tarjeta         ₡50 000,00  │  Banco           ₡50 000,00   │
│                        920 000 │  920 000                      │
│                        ═══════ │  ═══════                      │
│            Cuadra siempre, o te dice por qué no.               │
│                                                                │
│  © 2026 T-Ledger · v1.0.0                                      │
└────────────────────────────────────────────────────────────────┘
```

Lo que la sostiene:

- **La T es estructura, no dibujo.** El travesaño es la única regla gruesa de la
  página; la pata nace de él y muere en la raya de totales. No hay caja, no hay
  tarjeta, no hay fondo distinto. Si se borran esas dos reglas, no queda nada
  que las reemplace: por eso son la composición y no un adorno.
- **La convención contable es lo que la hace verdadera.** El debe va a la
  izquierda de la pata y el haber a la derecha, las cifras en mono tabular, y los
  totales cierran con doble raya. Quien lleva libros lo reconoce al instante;
  quien no, ve dos columnas que dan igual.
- **La glosa cruza las dos columnas.** La frase de la persona narra el asiento
  entero, así que no pertenece a ningún lado: va arriba de su par, de borde a
  borde. Así el titular se cumple literalmente —una frase arriba, dos
  anotaciones abajo, una de cada lado—, y la T dice la verdad.

  Corrección sobre el boceto aprobado: ahí las frases estaban bajo el rótulo
  DEBE y las dos líneas del asiento bajo HABER, que contablemente es falso —las
  dos son del mismo asiento, una de cada lado—. Se corrigió antes de escribir el
  plan, porque el argumento entero de esta dirección es que un contador la
  reconozca.
- **Los tres pares suman lo mismo de los dos lados.** No es decoración: es la
  demostración de lo que el titular promete, verificable sumando.
- **Monocromo, cero color.** El botón de entrar se resuelve por luminancia, como
  manda el sistema. La landing no estrena una paleta que la app no tiene.

## El texto

| Dónde | Qué dice |
|---|---|
| Esquina izquierda | T-Ledger |
| Esquina derecha | Solicitar acceso · Entrar → |
| Titular | Vos anotás una cosa. El libro escribe dos. |
| Bajada, atenuada | Finanzas personales con contabilidad de partida doble de verdad. |
| Rótulos | DEBE · HABER |
| Las tres frases | «Gasté 20 mil en el súper» · «Me pagaron el salario» · «Abono 50 mil a la tarjeta» |
| Al pie de la pata | Cuadra siempre, o te dice por qué no. |
| Pie | © 2026 T-Ledger · v1.0.0 |

El titular no dice «contabilidad»: lo demuestra en vez de anunciarlo, y la
palabra espanta a quien no la usa. Las tres frases son las tres cosas que el
producto hace todos los días —gastar, cobrar, abonar—. La línea del pie sería
marketing sin su segunda mitad; con ella es la promesa que el producto cumple.

## Solicitar acceso

Abre un modal con la dirección de correo en grande, un botón de copiar y un
enlace que abre el cliente de correo con el asunto puesto. No guarda nada: no
hay endpoint, no hay tabla, no hay correos de gente que nunca va a entrar.

El modal y no solo el `mailto:` porque quien no tiene cliente de correo
configurado toca el enlace y no pasa nada, y esa es la mitad de la gente que
abre una landing en una computadora prestada.

Copy: «T-Ledger es de una persona y de quien esa persona invite. Si querés una
cuenta, escribime.»

## Cómo se comporta

- **Al cargar, la T se escribe sola.** Aparece la frase y un suspiro después se
  escribe su asiento al lado; tres pares escalonados, menos de un segundo en
  total. Es la demostración del titular, no un efecto: sin eso, el titular hay
  que creerlo. Con `prefers-reduced-motion`, todo aparece de una.
- **Al pasar el mouse por un par**, ese par queda encendido y los otros dos
  bajan a texto atenuado. Nada es clickeable: no se inventan controles que no
  llevan a ninguna parte, y la página se lee igual sin tocar nada.
- **`100dvh`, sin scroll.** En teléfono la T no entra —dos columnas de cuarenta
  caracteres no caben— y colapsa: cada frase con su asiento sangrado debajo. Es
  la misma lectura girada noventa grados.
- **Teclado:** dos paradas, en el orden en que se leen. El modal atrapa el foco
  y cierra con Escape, que ya lo da el diálogo del sistema.
- **Tema: papel blanco fijo**, sea cual sea la preferencia guardada, igual que
  `/entrar` y `/crear-cuenta`. Las tres son la misma superficie —papel y tinta—
  y el botón de entrar lleva de una a la otra: con la landing en oscuro, tocarlo
  encandila. Se fuerza antes del primer pintado, no en un efecto normal, o la
  pantalla asoma un cuadro con el tema viejo y parpadea. Al salir, el documento
  vuelve a la preferencia de la persona.
- **Cero peso nuevo.** Sin imágenes, sin fuentes nuevas, sin librerías.

## Sin React Bits

`BlinkingDots` —el campo de puntos de `/entrar` y `/crear-cuenta`— queda afuera
de la landing por dos razones. Arrastra Three.js y `@react-three/fiber`: 660 KB
sin comprimir, unos 170 KB comprimidos, para una textura donde una de cada
veinte celdas tiene un punto; en la segunda pantalla eso es aceptable, en la
primera que carga un desconocido es el costo más caro por el efecto menos
visible. Y la T ya tiene su gesto: un campo animado detrás sería un segundo
movimiento peleando con el primero, cuando el sistema pide plano en reposo.

La continuidad con `/entrar` la dan el papel, la tinta y la tipografía.

## La ruta

Hoy `/` es el tablero y la guarda de `__root.tsx` manda a `/entrar` a quien no
tiene sesión: el dominio **es** un formulario de ingreso.

**La landing pasa a ser `/` y el tablero se muda a `/tablero`.** Cada URL tiene
una sola cara. Hay que renombrar `routes/index.tsx` y actualizar las referencias
a `/` que existen hoy: barra lateral, atajo `g h`, «no encontrado», el
`redirigirA` de entrar, los `assign('/')` de crear y cambiar libro, y la guía.

La landing **pinta primero y pregunta después**. Si la guarda esperara la
respuesta de sesión antes de dibujar, el visitante anónimo —que es para quien
existe la página— se comería la espera de una consulta que en su caso siempre
da «no». Se dibuja de una, y si resulta que hay sesión, ahí salta a `/tablero`.

Se descartaron: `/` con dos caras según la sesión —el layout pasaría a depender
de la sesión en vez del match de la ruta, que es lo que provocó el bug
documentado en `__root.tsx`, 720 ms de barra lateral alrededor del formulario— y
la landing en `/bienvenida`, que deja al que escribe el dominio cayendo en el
formulario igual que hoy.

## Lo que queda explícitamente afuera

Bento, capturas del producto, testimonios, precios, logos de tecnología,
gradientes, glass, y Nimbo. La mascota vive adentro de la app, donde acompaña;
la landing es el libro, no el personaje.
