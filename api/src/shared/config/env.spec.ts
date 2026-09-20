import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

const valid = {
  DATABASE_URL: 'postgresql://finanzas:finanzas@localhost:5433/finanzas',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
}

describe('loadEnv', () => {
  it('acepta una configuración completa y convierte el puerto a número', () => {
    expect(loadEnv(valid).PORT).toBe(3000)
  })

  it('falla al arrancar si falta la cadena de conexión', () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
  })

  it('falla si el puerto no es un número', () => {
    expect(() => loadEnv({ ...valid, PORT: 'tres mil' })).toThrow(/PORT/)
  })

  it('usa un valor por defecto para el origen permitido', () => {
    expect(loadEnv({ ...valid, CORS_ORIGIN: undefined }).CORS_ORIGIN).toBe('http://localhost:5173')
  })
})
