import BlinkingDots from '@/components/blinking-dots'

// El campo de puntos de las pantallas de entrada. Va acá y no suelto en cada página para que
// los valores se decidan una sola vez: es el mismo fondo, y ajustarlo en un lugar es la
// diferencia entre una identidad y tres pantallas parecidas.
//
// `coverage` en 0,05 contra el 0,8 que trae por defecto: una de cada veinte celdas tiene punto.
// Lo que se busca es un campo disperso que se note de reojo, no una textura que compita con
// el formulario que está encima.
//
// Los colores van escritos y no leídos del tema: la pantalla de entrar corre en claro fijo
// —lo pide `forceTheme` al montar— porque papel blanco con tinta negra es lo que la cinta de
// al lado imita. Un token acá volvería a atarlo al tema del resto de la app.
//
// Si alguna vez hay que volver a atarlo: Three.js no entiende `oklch()`, que es como está
// escrita la paleta, y convertirlo tiene una trampa. `getComputedStyle` devuelve el `oklch()`
// tal cual, y asignarlo a `fillStyle` y volver a leerlo también. Lo único que convierte de
// verdad es **pintar**: un píxel en un canvas y leerlo con `getImageData`.
const PAPEL = '#ffffff'
const TINTA = '#0a0a0a'

export const FondoDePuntos = () => {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <BlinkingDots
        width="100%"
        height="100%"
        coverage={0.05}
        density={26}
        twinkle={0.55}
        twinkleSpeed={0.35}
        backgroundColor={PAPEL}
        colorFrom={TINTA}
        colorTo={TINTA}
        cursorInteraction={false}
        vignette={0.35}
      />
    </div>
  )
}
