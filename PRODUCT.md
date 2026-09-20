# Product

## Register

product

## Users

Emilio, usuario único. No hay equipo, no hay roles, no hay registro público.

Dos contextos de uso con pesos distintos, y la diferencia importa:

- **Teléfono, ráfagas cortas.** Anotar un gasto apenas ocurre, de pie, en segundos. Es el camino que más se recorre y el que menos tiempo tiene.
- **Escritorio, sesiones largas.** Revisar, cuadrar, cerrar el mes. Monitor grande, teclado, sin apuro.

No hay una tarea dominante. De cada diez veces que abre la app, viene a hacer las cuatro cosas: registrar un movimiento, decidir sobre el futuro (proyección, deudas, metas), chequear cómo va el mes, y cuadrar la contabilidad. Eso descarta construir el producto alrededor de una pantalla heroica.

## Product Purpose

Un sistema de planificación y registro financiero personal con contabilidad de partida doble real. Existe para responder preguntas que una lista de montos no puede: en qué mes se libera cada cuota, cuánto interés se ahorra abonando de más, si una meta llega a su fecha, cuánto rinde una inversión, y si el mes cierra.

Está funcionando cuando Emilio lo sigue usando a los seis meses. Eso depende de dos cosas: que anotar cueste segundos, y que los números se puedan rastrear hasta su origen.

Fracasa si deja de anotar. Todo lo demás del sistema se alimenta de ese gesto.

## Brand Personality

**Denso, directo, verificable.**

Se usa sin ceremonia: se abre, se hace lo que se vino a hacer, se cierra. No explica de más, no celebra, no acompaña. La confianza no viene del tono sino de poder comprobar cualquier cifra.

Referencias de producto, y qué se toma de cada una:

| Referencia | Qué aporta |
|---|---|
| **Linear** | La dominante. Densidad sin agobio, velocidad, teclado, oscuro nativo, cero adorno |
| **Stripe Dashboard** | Cómo se leen los números: claridad tipográfica y estructura fuerte en las cifras |
| **Raycast** | El camino de alta: mínimo, directo, adentro y afuera |
| **Notion** | Solo la ausencia de ruido. No su generosidad de espacio, que acá pierde contra la densidad |

Cuando la densidad de Linear y la calma de Notion chocan, **gana la densidad**. La calma se consigue quitando adorno, no agregando aire.

## Anti-references

Los cuatro, marcados explícitamente:

- **App de banco o fintech de consumo** (Revolut, Nubank). Colores saturados, ilustraciones, tarjetas redondeadas, gamificación, tono alegre. Nada de eso.
- **Contabilidad tradicional** (SAP, QuickBooks, sistemas contables locales). Densidad sin jerarquía, barras de herramientas, gris sobre gris, todo del mismo peso. Este producto es denso, que es distinto de indiferenciado.
- **Tablero de SaaS.** Fila de tarjetas de métricas arriba, gráficos de relleno, barra lateral gris con quince ítems planos.
- **Excel con estilos.** Tablas por todos lados sin criterio de qué importa. Si el resultado se puede reemplazar por una hoja de cálculo, la hoja de cálculo gana.

Reflejos de categoría prohibidos, por ser la primera respuesta automática del rubro: «finanzas → azul marino y dorado», «tablero → azul oscuro», y su versión un nivel más profunda, «fintech que no es navy → terminal verde sobre negro».

Nada de dorado, ámbar, mostaza ni bronce.

## Design Principles

1. **La densidad es la forma de la calma.** Más información por pantalla, menos desplazamiento. Lo que tranquiliza no es el aire, es la ausencia de ruido. Una fila compacta y limpia se lee mejor que una espaciada y decorada.

2. **Todo número es rastreable.** Ninguna cifra existe sin un camino hacia lo que la compone. Un total de gasto lleva a sus movimientos; un saldo, a su mayor. La contabilidad existe para no tener que confiar, y una interfaz que obliga a confiar la desperdicia.

3. **Cuatro modos, cuatro caras.** Registrar, decidir, chequear y cuadrar son trabajos distintos. Ninguno es la pantalla principal. La navegación tiene que hacer obvio en cuál estás y cómo llegar al otro, sin que haya que recordar dónde vive cada cosa.

4. **Anotar cuesta segundos.** El camino de alta de un movimiento es el más corto del producto y funciona con una mano, de pie, en un teléfono. Cualquier campo que no se pueda contestar en el momento es opcional o se infiere.

5. **Una tabla sin jerarquía es una hoja de cálculo.** Toda vista tiene que decir qué importa. Si todas las filas y todas las secciones pesan lo mismo, no está diseñada, está rellenada.

## Accessibility & Inclusion

- **WCAG AA**, verificado en los dos temas: 4,5:1 en texto, 3:1 en controles y elementos no textuales.
- **Nada depende solo del color.** Un número negativo lleva signo además de color; un estado lleva etiqueta además de indicador. En contabilidad el signo *es* el dato, y comunicarlo solo con color lo pierde.
- **El texto escala sin romper.** Con zoom al 200 % o tamaño de fuente aumentado del sistema, nada se corta ni se superpone.
- Navegación completa por teclado con foco visible, que es parte de AA y además de lo que Linear aporta como referencia.
- `prefers-reduced-motion` no se declaró como requisito. El riesgo es bajo porque el movimiento del producto es mínimo por definición, pero respetarlo es gratis y se hace igual.
