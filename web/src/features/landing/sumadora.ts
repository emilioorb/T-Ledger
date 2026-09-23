import { useEffect, useState } from 'react'
import { useHidratado } from '@/lib/use-hidratado'

// Un paso de la sumadora: en qué momento entra un asiento y a cuánto llega el acumulado.
export interface Paso {
  en: number
  hasta: number
}

// Lo que tarda cada tirada de los rodillos. Corto: es un aparato, no una celebración.
export const TIRADA = 380

const salida = (t: number) => 1 - (1 - t) ** 3

// Lo que marca la sumadora a los `ms` de arrancar. Arranca en cero, y cada paso corre desde el
// acumulado anterior hasta el suyo. Pura, para poder probar la cuenta sin esperar cuadros.
export const marcaEn = (ms: number, pasos: readonly Paso[]): number => {
  let marca = 0
  for (const paso of pasos) {
    if (ms < paso.en) break
    const avance = Math.min((ms - paso.en) / TIRADA, 1)
    marca += (paso.hasta - marca) * salida(avance)
  }
  return Math.round(marca)
}

export const finDe = (pasos: readonly Paso[]): number => (pasos.at(-1)?.en ?? 0) + TIRADA

const pideCalma = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// La marca de la sumadora cuadro a cuadro. Quien pidió menos movimiento ve el total de una,
// salvo al hidratar la portada prerenderizada, cuyo HTML trae cero: ahí el total llega en el
// efecto. `desfase` es cuánto hace que arrancaron las animaciones de ese HTML (0 si la portada
// se creó en el navegador): la cuenta va con ellas, y si el JavaScript llegó tarde, salta a
// donde tendría que ir.
export const useSumadora = (pasos: readonly Paso[], desfase: number): number => {
  const final = pasos.at(-1)?.hasta ?? 0
  const hidratado = useHidratado()
  const [marca, setMarca] = useState(() => (hidratado && pideCalma() ? final : 0))

  useEffect(() => {
    if (pideCalma()) {
      setMarca(final)
      return
    }
    const inicio = performance.now() - desfase
    const fin = finDe(pasos)
    let cuadro = 0
    const tirar = () => {
      const ms = performance.now() - inicio
      setMarca(marcaEn(ms, pasos))
      if (ms < fin) cuadro = requestAnimationFrame(tirar)
    }
    cuadro = requestAnimationFrame(tirar)
    return () => cancelAnimationFrame(cuadro)
  }, [pasos, final, desfase])

  return marca
}
