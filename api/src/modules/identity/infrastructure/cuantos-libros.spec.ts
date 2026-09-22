import { describe, expect, it } from 'vitest'
import { LIBROS_POR_PERSONA, puedeCrearLibro } from './cuantos-libros.js'

describe('cuántos libros puede tener una persona', () => {
  it('sin ninguno, puede', () => {
    expect(puedeCrearLibro(0)).toBe(true)
  })

  it('con uno menos del tope, todavía puede', () => {
    expect(puedeCrearLibro(LIBROS_POR_PERSONA - 1)).toBe(true)
  })

  it('con el tope, no', () => {
    expect(puedeCrearLibro(LIBROS_POR_PERSONA)).toBe(false)
  })

  it('con más del tope tampoco: el límite no se gana por haberlo pasado antes', () => {
    // Puede pasar si alguna vez se bajó el número, o si dos pedidos entraron a la vez.
    expect(puedeCrearLibro(LIBROS_POR_PERSONA + 5)).toBe(false)
  })
})
