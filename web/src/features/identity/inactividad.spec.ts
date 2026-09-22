// @vitest-environment node
//
// Sin DOM: acá se prueba la regla, no el vigilante que la consulta.
import { describe, expect, it } from 'vitest'
import { AVISO_DESDE, faltaParaCerrar, INACTIVIDAD_MAXIMA, pasoDeSesion } from './inactividad'

const ACTIVO_A_LAS = 1_000_000

describe('pasoDeSesion', () => {
  it('sigue mientras hay actividad reciente', () => {
    const ahora = ACTIVO_A_LAS + 1_000

    expect(pasoDeSesion({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe('seguir')
  })

  it('sigue hasta el instante anterior al aviso', () => {
    const ahora = ACTIVO_A_LAS + AVISO_DESDE - 1

    expect(pasoDeSesion({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe('seguir')
  })

  it('avisa al llegar al umbral', () => {
    const ahora = ACTIVO_A_LAS + AVISO_DESDE

    expect(pasoDeSesion({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe('avisar')
  })

  it('cierra al agotarse la tolerancia', () => {
    const ahora = ACTIVO_A_LAS + INACTIVIDAD_MAXIMA

    expect(pasoDeSesion({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe('cerrar')
  })

  it('sigue cerrando si pasó mucho más tiempo', () => {
    // La pestaña dormida vuelve a la vida horas después: lo que corresponde es cerrar, no
    // recalcular como si recién empezara.
    const ahora = ACTIVO_A_LAS + INACTIVIDAD_MAXIMA * 10

    expect(pasoDeSesion({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe('cerrar')
  })

  it('cualquier señal de vida vuelve a empezar', () => {
    const casiCerrada = ACTIVO_A_LAS + INACTIVIDAD_MAXIMA - 1
    const seMovio = casiCerrada

    expect(pasoDeSesion({ ahora: casiCerrada, ultimaActividad: seMovio })).toBe('seguir')
  })
})

describe('faltaParaCerrar', () => {
  it('cuenta los milisegundos que quedan', () => {
    const ahora = ACTIVO_A_LAS + AVISO_DESDE

    expect(faltaParaCerrar({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe(
      INACTIVIDAD_MAXIMA - AVISO_DESDE,
    )
  })

  it('nunca devuelve un número negativo', () => {
    // Si el reloj se pasó del cierre, la cuenta regresiva no puede seguir bajando: sería la
    // pantalla avisando que ya es tarde mientras todavía está abierta.
    const ahora = ACTIVO_A_LAS + INACTIVIDAD_MAXIMA + 5_000

    expect(faltaParaCerrar({ ahora, ultimaActividad: ACTIVO_A_LAS })).toBe(0)
  })
})
