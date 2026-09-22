import { COLORES, colorPorPosicion } from '@/components/color-picker'
import { crearAjuste } from './ajuste-local'

// De qué color anda Nimbo. `null` es la tinta del tema —negro sobre claro, claro sobre
// oscuro—, que es como nació y sigue siendo lo predeterminado: la mascota acompaña, no compite
// con los números.
export type ColorDeNimbo = number | null

const STORAGE_KEY = 'finanzas.nimbo'

const esDeLaPaleta = (valor: number): boolean => (COLORES as readonly number[]).includes(valor)

export const colorDeNimbo = crearAjuste<ColorDeNimbo>(
  STORAGE_KEY,
  (guardado) => {
    const numero = Number(guardado)
    return guardado !== null && Number.isInteger(numero) && esDeLaPaleta(numero) ? numero : null
  },
  (valor) => (valor === null ? '' : String(valor)),
)

// Los diez de la mascota y no los del tema. Los `--bucket-*` se redefinen en oscuro porque
// ahí el color es un tramo de una barra y tiene que pesar igual sobre cada fondo; el de Nimbo
// es su color, y uno que cambia de tono al cambiar el tema no se lee como el mismo.
export const colorDeNimboCss = (indice: number | null): string =>
  `var(--nimbo-${indice ?? colorPorPosicion(0)})`
