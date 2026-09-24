import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Auth } from '../../identity/infrastructure/auth.config.js'
import { AdminGuard } from './admin.guard.js'

const conSesion = (user: { id: string; email: string } | null) =>
  ({ api: { getSession: async () => (user ? { user } : null) } }) as unknown as Auth

const contexto = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as unknown as ExecutionContext
const peticion = { headers: {} } as Request

// El guard valida el entorno entero al construirse: se le da el mínimo que pide.
beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://x@localhost:5432/x')
  vi.stubEnv('AUTH_SECRET', 'x'.repeat(32))
  vi.stubEnv('ADMIN_USER_IDS', 'usr_emilio')
})
afterEach(() => vi.unstubAllEnvs())

describe('AdminGuard', () => {
  it('administra quien tiene el id de la lista', async () => {
    const guard = new AdminGuard(conSesion({ id: 'usr_emilio', email: 'emilio@ejemplo.com' }))

    await expect(guard.canActivate(contexto)).resolves.toBe(true)
    await expect(guard.loEs(peticion)).resolves.toBe(true)
  })

  it('decide por el id de la sesión y no por el correo, que cualquiera puede registrar', async () => {
    const guard = new AdminGuard(conSesion({ id: 'usr_intruso', email: 'usr_emilio' }))

    await expect(guard.canActivate(contexto)).rejects.toThrow(ForbiddenException)
    await expect(guard.loEs(peticion)).resolves.toBe(false)
  })

  it('sin sesión no administra nadie', async () => {
    const guard = new AdminGuard(conSesion(null))

    await expect(guard.canActivate(contexto)).rejects.toThrow(ForbiddenException)
  })
})
