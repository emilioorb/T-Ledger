import { describe, expect, it } from 'vitest'
import { editor, owner, viewer } from './roles.js'

describe('roles del libro', () => {
  it('el que mira no escribe: es la razón de que el rol exista', () => {
    expect(viewer.authorize({ movimiento: ['create'] }).success).toBe(false)
    expect(viewer.authorize({ movimiento: ['update'] }).success).toBe(false)
    expect(viewer.authorize({ movimiento: ['delete'] }).success).toBe(false)
  })

  it('el que mira, mira', () => {
    expect(viewer.authorize({ movimiento: ['read'] }).success).toBe(true)
    expect(viewer.authorize({ periodo: ['read'] }).success).toBe(true)
  })

  it('el que mira tampoco cierra un mes, que no es escribir un movimiento pero cambia el libro', () => {
    expect(viewer.authorize({ periodo: ['close'] }).success).toBe(false)
  })

  it('el editor hace toda la contabilidad', () => {
    expect(editor.authorize({ movimiento: ['create', 'update', 'delete'] }).success).toBe(true)
    expect(editor.authorize({ periodo: ['close', 'reopen'] }).success).toBe(true)
    expect(editor.authorize({ presupuesto: ['write'] }).success).toBe(true)
  })

  it('el editor no toca la gente ni borra el libro', () => {
    expect(editor.authorize({ member: ['create'] }).success).toBe(false)
    expect(editor.authorize({ member: ['delete'] }).success).toBe(false)
    expect(editor.authorize({ libro: ['delete'] }).success).toBe(false)
  })

  it('el dueño invita, saca gente y borra el libro', () => {
    expect(owner.authorize({ member: ['create', 'delete'] }).success).toBe(true)
    expect(owner.authorize({ invitation: ['create', 'cancel'] }).success).toBe(true)
    expect(owner.authorize({ libro: ['delete', 'vaciar'] }).success).toBe(true)
  })

  it('el dueño también hace la contabilidad: manda, no delega', () => {
    expect(owner.authorize({ movimiento: ['create'] }).success).toBe(true)
    expect(owner.authorize({ periodo: ['close'] }).success).toBe(true)
  })

  // Renombrar pasa por Better Auth; borrar pasa por nuestro endpoint, que pide la contraseña y
  // no deja a nadie sin libro. Con `organization: delete` el de Better Auth lo saltearía.
  it('el dueño renombra por Better Auth pero no borra por ahí', () => {
    expect(owner.authorize({ organization: ['update'] }).success).toBe(true)
    expect(owner.authorize({ organization: ['delete'] }).success).toBe(false)
  })
})
