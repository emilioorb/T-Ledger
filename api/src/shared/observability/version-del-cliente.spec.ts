import type { Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
import { leerVersionDelCliente, versionDelCliente, VersionDelClienteMiddleware } from './version-del-cliente.js'

describe('la versión del cliente', () => {
  it('la que tiene forma de versión pasa tal cual', () => {
    expect(leerVersionDelCliente('1.3.1')).toBe('1.3.1')
  })

  it('sin cabecera es la app sin actualizar, y lo que no tiene forma de versión no entra al log', () => {
    expect(leerVersionDelCliente(undefined)).toBe('sin cabecera')
    expect(leerVersionDelCliente('1.0\n[ERROR] inventado')).toBe('ilegible')
    expect(leerVersionDelCliente('x'.repeat(40))).toBe('ilegible')
  })

  it('queda en el contexto de todo lo que corre después del middleware', () => {
    const peticion = { header: () => '1.4.0' } as unknown as Request
    let vista = ''

    new VersionDelClienteMiddleware().use(peticion, {} as Response, () => {
      vista = versionDelCliente()
    })

    expect(vista).toBe('1.4.0')
    expect(versionDelCliente()).toBe('fuera de un pedido')
  })
})
