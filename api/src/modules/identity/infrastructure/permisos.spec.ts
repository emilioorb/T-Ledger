import { describe, expect, it } from 'vitest'
import { puede } from './permisos.js'

describe('qué puede cada rol', () => {
  it('el que mira no escribe: es la razón de que el rol exista', () => {
    expect(puede('viewer', 'movimiento', 'create')).toBe(false)
    expect(puede('viewer', 'movimiento', 'update')).toBe(false)
    expect(puede('viewer', 'movimiento', 'delete')).toBe(false)
  })

  it('el que mira, mira', () => {
    expect(puede('viewer', 'movimiento', 'read')).toBe(true)
    expect(puede('viewer', 'deuda', 'read')).toBe(true)
  })

  it('el que mira tampoco cierra un mes: no es escribir un movimiento, pero cambia el libro', () => {
    expect(puede('viewer', 'periodo', 'close')).toBe(false)
    expect(puede('viewer', 'periodo', 'reopen')).toBe(false)
  })

  it('el editor hace toda la contabilidad', () => {
    expect(puede('editor', 'movimiento', 'create')).toBe(true)
    expect(puede('editor', 'periodo', 'close')).toBe(true)
    expect(puede('editor', 'presupuesto', 'write')).toBe(true)
    expect(puede('editor', 'inversion', 'write')).toBe(true)
  })

  it('el editor no toca la gente ni borra el libro', () => {
    expect(puede('editor', 'member', 'create')).toBe(false)
    expect(puede('editor', 'member', 'delete')).toBe(false)
    expect(puede('editor', 'libro', 'delete')).toBe(false)
    expect(puede('editor', 'libro', 'vaciar')).toBe(false)
  })

  it('el dueño invita, saca gente, vacía y borra', () => {
    expect(puede('owner', 'member', 'create')).toBe(true)
    expect(puede('owner', 'member', 'delete')).toBe(true)
    expect(puede('owner', 'libro', 'vaciar')).toBe(true)
    expect(puede('owner', 'libro', 'delete')).toBe(true)
  })

  it('el dueño también hace la contabilidad: manda, no delega', () => {
    expect(puede('owner', 'movimiento', 'create')).toBe(true)
    expect(puede('owner', 'periodo', 'close')).toBe(true)
  })
})
