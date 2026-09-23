import { useState } from 'react'
import BlinkingDots from '@/components/blinking-dots'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Los colores van escritos y no leídos del tema: Three.js no entiende `oklch()`, que es como
// está escrita la paleta. Son el fondo y el texto principal de DESIGN.md en hexadecimal, así
// que el lienzo pinta el mismo papel que la página y, mientras arranca, no se nota dónde
// termina uno y empieza el otro.
//
// Si alguna vez hay que leerlos del tema, la conversión tiene una trampa: `getComputedStyle`
// devuelve el `oklch()` tal cual, y asignarlo a `fillStyle` y volver a leerlo también. Lo único
// que convierte de verdad es **pintar**: un píxel en un canvas y leerlo con `getImageData`.
const PAPEL_Y_TINTA: Record<Theme, { papel: string; tinta: string }> = {
  light: { papel: '#fdfbf8', tinta: '#1d1915' },
  dark: { papel: '#0e0c0a', tinta: '#f3efed' },
}

// El campo de puntos de las pantallas de antes de entrar. Se monta una sola vez para las tres
// —lo pone la raíz— y no una por pantalla: el lienzo tarda unos 400 ms en arrancar, y
// remontarlo en cada cambio de página hacía aparecer los puntos de golpe cada vez.
//
// `coverage` en 0,05 contra el 0,8 que trae por defecto: una de cada veinte celdas tiene punto.
// Lo que se busca es un campo disperso que se note de reojo, no una textura que compita con
// lo que está encima.
//
// Entra desde transparente cuando el lienzo ya pintó su primer cuadro, no al montarse: si la
// aparición arrancara antes, correría mientras se compila el shader y el primer cuadro visible
// saldría a mitad de camino. Medido: sin esperar el cuadro, arrancaba en 52 %.
export const FondoDePuntos = ({ tema }: { tema: Theme }) => {
  const [listo, setListo] = useState(false)
  const { papel, tinta } = PAPEL_Y_TINTA[tema]

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700 ease-out motion-reduce:transition-none',
        listo ? 'opacity-100' : 'opacity-0',
      )}
    >
      <BlinkingDots
        width="100%"
        height="100%"
        coverage={0.05}
        density={26}
        twinkle={0.55}
        twinkleSpeed={0.35}
        backgroundColor={papel}
        colorFrom={tinta}
        colorTo={tinta}
        cursorInteraction={false}
        vignette={0.35}
        dpr={1}
        onReady={() => setListo(true)}
      />
    </div>
  )
}
