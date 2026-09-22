import { useEffect, useState } from 'react'

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

// La marca de la sumadora cuadro a cuadro. Quien pidió menos movimiento ve el total de una.
export const useSumadora = (pasos: readonly Paso[]): number => {
  const final = pasos.at(-1)?.hasta ?? 0
  const [marca, setMarca] = useState(() => (pideCalma() ? final : 0))

  useEffect(() => {
    if (pideCalma()) return
    const inicio = performance.now()
    const fin = finDe(pasos)
    let cuadro = 0
    const tirar = () => {
      const ms = performance.now() - inicio
      setMarca(marcaEn(ms, pasos))
      if (ms < fin) cuadro = requestAnimationFrame(tirar)
    }
    cuadro = requestAnimationFrame(tirar)
    return () => cancelAnimationFrame(cuadro)
  }, [pasos])

  return marca
}
