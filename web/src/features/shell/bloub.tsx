import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Avatar «nuage» tomado de bloub (https://github.com/jeremy-prt/bloub), de Jérémy Prt, bajo
// licencia MIT: una recreación en SVG medida cuadro por cuadro sobre el original, redibujada
// con los colores del tema en vez de los suyos, para que sea negro sobre claro y claro sobre
// oscuro sin dos versiones del archivo.
//
// El cuerpo toma `currentColor` y los ojos el color del fondo: así el avatar entero es una
// sola decisión de color y nunca queda un ojo negro sobre un cuerpo negro.
const CUERPO =
  'M91.57 0.24C92.87 3.22 93.89 6.39 94.58 9.56C95.27 12.74 95.66 16.05 95.72 19.3C95.78 22.55 95.51 25.87 94.94 29.07C94.36 32.27 93.45 35.47 92.26 38.5C91.07 41.52 89.55 44.48 87.79 47.22C86.04 49.95 83.97 52.56 81.71 54.9C79.46 57.24 76.92 59.39 74.25 61.24C71.58 63.09 68.67 64.71 65.69 66C62.71 67.3 59.54 68.31 56.36 69C53.19 69.68 49.28 68.94 46.63 70.11C43.98 71.29 42.67 74.21 40.47 76.05C38.28 77.89 35.92 79.61 33.46 81.13C31 82.65 28.4 84.01 25.73 85.17C23.06 86.32 20.26 87.3 17.44 88.05C14.62 88.81 11.7 89.36 8.79 89.69C5.88 90.03 2.92 90.15 -0.01 90.05C-2.93 89.95 -5.88 89.63 -8.75 89.11C-11.62 88.59 -14.48 87.84 -17.23 86.91C-19.98 85.98 -22.68 84.83 -25.25 83.52C-27.81 82.21 -30.27 80.65 -32.62 79.05C-34.97 77.45 -36.6 74.79 -39.35 73.92C-42.11 73.05 -45.9 74.17 -49.15 73.85C-52.39 73.53 -55.68 72.91 -58.84 71.99C-61.99 71.08 -65.13 69.85 -68.07 68.37C-71.02 66.89 -73.88 65.1 -76.52 63.09C-79.15 61.08 -81.64 58.79 -83.86 56.33C-86.09 53.86 -88.12 51.14 -89.85 48.31C-91.58 45.47 -93.07 42.42 -94.24 39.31C-95.42 36.2 -96.32 32.93 -96.91 29.66C-97.49 26.39 -97.77 23.01 -97.74 19.7C-97.71 16.38 -97.36 13.02 -96.72 9.77C-96.09 6.53 -95.13 3.3 -93.91 0.24C-92.7 -2.82 -91.17 -5.81 -89.42 -8.58C-87.68 -11.35 -85.65 -13.99 -83.45 -16.38C-81.25 -18.76 -78.16 -20.71 -76.22 -22.9C-74.28 -25.1 -72.66 -27.05 -71.81 -29.53C-70.96 -32.02 -71.59 -35.08 -71.12 -37.81C-70.65 -40.54 -69.94 -43.28 -69 -45.9C-68.05 -48.53 -66.86 -51.11 -65.47 -53.54C-64.08 -55.97 -62.45 -58.31 -60.65 -60.47C-58.85 -62.62 -56.83 -64.64 -54.68 -66.45C-52.53 -68.25 -50.18 -69.89 -47.75 -71.28C-45.32 -72.68 -42.72 -73.88 -40.09 -74.82C-37.45 -75.77 -34.7 -76.48 -31.95 -76.95C-29.2 -77.42 -26.38 -77.64 -23.61 -77.63C-20.83 -77.61 -18.03 -77.34 -15.33 -76.84C-12.62 -76.35 -9.93 -75.61 -7.38 -74.67C-4.83 -73.73 -2.33 -72.55 -0.01 -71.21C2.32 -69.87 4.44 -67.8 6.57 -66.63C8.7 -65.46 10.51 -64.17 12.79 -64.16C15.07 -64.15 17.69 -65.99 20.23 -66.56C22.78 -67.14 25.43 -67.5 28.06 -67.61C30.69 -67.71 33.39 -67.59 36.01 -67.22C38.63 -66.85 41.27 -66.23 43.8 -65.39C46.32 -64.54 48.81 -63.45 51.15 -62.16C53.48 -60.86 55.74 -59.33 57.8 -57.63C59.86 -55.93 61.8 -54 63.52 -51.95C65.24 -49.9 66.8 -47.66 68.11 -45.33C69.43 -43 70.55 -40.5 71.41 -37.98C72.28 -35.45 72.92 -32.8 73.31 -30.16C73.71 -27.53 72.58 -24.56 73.76 -22.16C74.95 -19.76 78.25 -18.08 80.42 -15.78C82.6 -13.47 84.93 -10.99 86.79 -8.32C88.64 -5.65 90.27 -2.74 91.57 0.24Z'

// Los dieciséis ojos del original son la misma figura con otras medidas: una cápsula de
// esquinas completamente redondeadas, alta cuando el ojo está abierto y ancha cuando es un
// arco de sonrisa. Con la fórmula acá son dos números por ojo en vez de dieciséis cadenas
// de trescientos caracteres, y de paso queda claro qué cambia entre un gesto y otro.
const capsula = (ancho: number, alto: number) => {
  const r = Math.min(ancho, alto)
  const x = ancho - r
  const y = alto - r
  const arco = `A${r} ${r} 0 0 1`
  return `M${-ancho} ${-y}${arco} ${-x} ${-alto}L${x} ${-alto}${arco} ${ancho} ${-y}L${ancho} ${y}${arco} ${x} ${alto}L${-x} ${alto}${arco} ${-ancho} ${y}Z`
}

interface Ojo {
  ancho: number
  alto: number
  // Grados hacia adentro: positivo baja la esquina interna —enojo— y negativo la sube. Es lo
  // único que distingue «molesto» de «orgulloso», que tienen el mismo ojo.
  gira?: number
}

interface Gesto {
  izq: Ojo
  der: Ojo
  // Achatamiento del párpado. Va aparte del alto porque aplasta también las esquinas, que es
  // lo que hace que un ojo medio cerrado no se lea como un ojo chiquito.
  parpado?: number
}

// Diez de los dieciséis del original. Quedaron fuera los que a este tamaño no se distinguen
// de alguno que sí está —«atento» y «tímido» son el neutro con los ojos un punto más grandes
// o más chicos, «risueño» es el contento, «harto» es el adormilado— y los que ningún dato
// del tablero puede afirmar: no hay nada en un libro contable que signifique «sorprendido»
// ni «curioso», y una cara sin dato detrás es una cara que miente.
export const GESTOS = {
  neutro: { izq: { ancho: 9.3, alto: 20.6 }, der: { ancho: 9.3, alto: 20.6 } },
  contento: {
    izq: { ancho: 13.5, alto: 8.5, gira: 12 },
    der: { ancho: 13.5, alto: 8.5, gira: 12 },
  },
  emocionado: { izq: { ancho: 20, alto: 28, gira: -6 }, der: { ancho: 20, alto: 28, gira: -6 } },
  orgulloso: { izq: { ancho: 15, alto: 7.5, gira: 15 }, der: { ancho: 15, alto: 7.5, gira: 15 } },
  triste: { izq: { ancho: 11, alto: 20, gira: -26 }, der: { ancho: 11, alto: 20, gira: -26 } },
  molesto: { izq: { ancho: 17, alto: 7.5, gira: 30 }, der: { ancho: 17, alto: 7.5, gira: 30 } },
  asustado: { izq: { ancho: 20, alto: 30, gira: 6 }, der: { ancho: 20, alto: 30, gira: 6 } },
  desconfiado: { izq: { ancho: 10.5, alto: 20 }, der: { ancho: 11, alto: 7.5 } },
  confundido: { izq: { ancho: 10, alto: 22, gira: -12 }, der: { ancho: 14, alto: 8.5, gira: -24 } },
  adormilado: { izq: { ancho: 10, alto: 21 }, der: { ancho: 10, alto: 21 }, parpado: 0.52 },
} as const satisfies Record<string, Gesto>

export type NombreDeGesto = keyof typeof GESTOS

// Los ojos no están centrados sobre el cuerpo ni son idénticos entre sí: el original corre la
// cara un pelo a la derecha y hace el ojo derecho más angosto. Es lo que le saca la simetría
// de icono, así que va copiado tal cual.
const POSICION = { izq: { x: -27, escala: 0.96 }, der: { x: 35, escala: 0.93 } } as const

const ubicar = (lado: 'izq' | 'der', ojo: Ojo, parpado: number) => {
  const { x, escala } = POSICION[lado]
  const giro = (ojo.gira ?? 0) * (lado === 'izq' ? 1 : -1)
  return `translate(${x} 2.5) rotate(${giro}) scale(${escala} ${parpado})`
}

// Lo que tarda el párpado en bajar. Es el mismo tramo que el parpadeo de reposo —unos
// noventa milisegundos— porque es el mismo gesto: acá no se pestañea porque sí, se pestañea
// para cambiar de cara.
const CIERRE = 90

// Una cara no se cambia de un cuadro al otro: eso es un sprite. Cierra los ojos, cambia
// detrás del párpado y los abre con la cara nueva. Vale para los dos usos del avatar —acá y
// el del tablero, que cambia de ánimo cuando cambian las cifras—, así que vive adentro del
// componente y nadie tiene que acordarse de pedirlo.
const usarParpadeoDeCambio = (gesto: NombreDeGesto) => {
  const [visible, setVisible] = useState(gesto)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    if (gesto === visible) return

    setCerrado(true)
    const cambio = setTimeout(() => {
      setVisible(gesto)
      setCerrado(false)
    }, CIERRE)
    return () => clearTimeout(cambio)
  }, [gesto, visible])

  return { visible, cerrado }
}

interface Props {
  gesto?: NombreDeGesto
  className?: string
}

export const Bloub = ({ gesto = 'neutro', className }: Props) => {
  const { visible, cerrado } = usarParpadeoDeCambio(gesto)
  const { izq, der, parpado = 1 }: Gesto = GESTOS[visible]
  return (
    // El viewBox original mide 316 y el dibujo ocupa 193,5 × 167,7: más de un tercio era aire,
    // así que la nube se veía chica dentro de su propia caja. Acá va ajustado a la forma, con
    // seis unidades de margen para que la respiración no roce el borde al escalar.
    <svg
      viewBox="-104 -84 206 180"
      className={cn('text-foreground', className)}
      role="img"
      aria-hidden="true"
    >
      {/* La respiración va en el grupo entero y el parpadeo solo en los ojos: dos ritmos
          distintos, que es lo que hace que no se lea como un bucle. */}
      <g className="bloub-breathe">
        <path d={CUERPO} fill="currentColor" />
        <g className="bloub-blink">
          <g className="bloub-gesto" data-cerrado={cerrado}>
            <path
              d={capsula(izq.ancho, izq.alto)}
              transform={ubicar('izq', izq, parpado)}
              className="fill-background"
            />
            <path
              d={capsula(der.ancho, der.alto)}
              transform={ubicar('der', der, parpado)}
              className="fill-background"
            />
          </g>
        </g>
      </g>
    </svg>
  )
}
