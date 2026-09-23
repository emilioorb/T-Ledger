import { describe, expect, it } from 'vitest'
import { pasaPorElProxy } from './solo-por-el-proxy.js'

const SECRETO = 'secreto-del-proxy-de-prueba-largo'

describe('pasaPorElProxy', () => {
  it('sin secreto configurado deja pasar todo: en local no hay proxy', () => {
    expect(pasaPorElProxy({ ruta: '/api/v1/movements', cabecera: undefined, secreto: undefined })).toBe(true)
  })

  it('deja pasar lo que trae el secreto exacto', () => {
    expect(pasaPorElProxy({ ruta: '/api/v1/movements', cabecera: SECRETO, secreto: SECRETO })).toBe(true)
  })

  it('rechaza lo que llega directo, sin la cabecera', () => {
    expect(pasaPorElProxy({ ruta: '/api/auth/sign-in/email', cabecera: undefined, secreto: SECRETO })).toBe(false)
  })

  it('rechaza un valor parecido, más corto o más largo', () => {
    for (const cabecera of ['secreto', `${SECRETO}x`, SECRETO.slice(0, -1), '']) {
      expect(pasaPorElProxy({ ruta: '/api/v1/movements', cabecera, secreto: SECRETO })).toBe(false)
    }
  })

  // Si en Vercel falta la variable, el transform manda el texto literal: tiene que rechazarse.
  it('rechaza la referencia sin expandir que manda Vercel cuando le falta la variable', () => {
    expect(pasaPorElProxy({ ruta: '/api/v1/movements', cabecera: '$PROXY_SECRET', secreto: SECRETO })).toBe(false)
  })

  // El chequeo de salud de Railway llega directo, sin pasar por Vercel.
  it('deja pasar el chequeo de salud, que es el contrato público de la API', () => {
    expect(pasaPorElProxy({ ruta: '/api/v1/openapi.json', cabecera: undefined, secreto: SECRETO })).toBe(true)
  })
})
