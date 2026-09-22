import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'
import { conLibro } from '../../../shared/libro/libro-context.js'
import { PermisoGuard } from './permiso.guard.js'

const pidiendo = (recurso: string, accion: string) => {
  const reflector = new Reflector()
  reflector.getAllAndOverride = (() => ({ recurso, accion })) as Reflector['getAllAndOverride']
  return new PermisoGuard(reflector)
}

const contexto = { getHandler: () => undefined, getClass: () => undefined } as unknown as ExecutionContext

describe('PermisoGuard', () => {
  // Corre antes que la guardia de sesión de Better Auth. Sin sesión el middleware no abre
  // contexto de libro, y antes eso terminaba en un 500 en lugar del 401 que corresponde.
  it('sin sesión contesta 401, no 500', () => {
    expect(() => pidiendo('libro', 'delete').canActivate(contexto)).toThrow(UnauthorizedException)
  })

  it('con un rol que no alcanza contesta 403', async () => {
    await conLibro({ bookId: 'lib', userId: 'usr', rol: 'editor' }, async () => {
      expect(() => pidiendo('libro', 'delete').canActivate(contexto)).toThrow(ForbiddenException)
    })
  })

  it('con el rol justo deja pasar', async () => {
    await conLibro({ bookId: 'lib', userId: 'usr', rol: 'owner' }, async () => {
      expect(pidiendo('libro', 'delete').canActivate(contexto)).toBe(true)
    })
  })
})
