import { getIP } from '@better-auth/core/utils/ip'
import { describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import { loadEnv } from '../../../shared/config/env.js'
import { crearAuth } from './auth.config.js'

const { options } = crearAuth(
  {} as PrismaClient,
  loadEnv({ DATABASE_URL: 'postgres://no-se-usa', AUTH_SECRET: 'x'.repeat(32) }),
  async () => {},
  async () => {},
  async () => {},
)

// Las cabeceras medidas en producción, con documentación de ejemplo en lugar de IPs reales.
// Sin configurar, Better Auth solo mira `x-forwarded-for`; acá esa cabecera trae dos saltos
// y la descarta, así que el límite de peticiones caía en un único cupo para todo el mundo.
describe('la IP con la que Better Auth limita las peticiones', () => {
  it('por Vercel es la del cliente, no la de salida de Vercel', () => {
    const porVercel = new Headers({
      'x-forwarded-for': '198.51.100.20, 203.0.113.9',
      'x-real-ip': '198.51.100.20',
      'x-vercel-forwarded-for': '192.0.2.44',
    })

    expect(getIP(porVercel, options)).toBe('192.0.2.44')
  })

  it('directo a Railway es la que pone el borde de Railway', () => {
    const directo = new Headers({
      'x-forwarded-for': '192.0.2.44, 203.0.113.9',
      'x-real-ip': '192.0.2.44',
    })

    expect(getIP(directo, options)).toBe('192.0.2.44')
  })
})
