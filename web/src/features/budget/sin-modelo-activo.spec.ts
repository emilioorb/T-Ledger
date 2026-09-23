import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { sinModeloActivo } from './sin-modelo-activo'

describe('sinModeloActivo', () => {
  it('reconoce el 422 de un libro sin modelo de presupuesto activo', () => {
    const error = new ApiError(422, 'SEMANTIC_VALIDATION_ERROR', 'No hay modelo activo')
    expect(sinModeloActivo(error)).toBe(true)
  })

  it('una caída de verdad no se disfraza de libro sin modelo', () => {
    expect(sinModeloActivo(new ApiError(500, 'INTERNAL_ERROR', 'Falló'))).toBe(false)
    expect(sinModeloActivo(new Error('sin red'))).toBe(false)
    expect(sinModeloActivo(null)).toBe(false)
  })
})
