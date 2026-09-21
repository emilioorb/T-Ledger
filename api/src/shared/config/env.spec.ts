import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

const SECRETO = 'un-secreto-de-al-menos-treinta-y-dos-caracteres'
const base = { DATABASE_URL: 'postgresql://x', AUTH_SECRET: SECRETO }

describe('loadEnv con Sentry', () => {
  it('arranca sin DSN: no tener telemetría no puede tumbar la app', () => {
    expect(loadEnv(base).SENTRY_DSN).toBeUndefined()
  })

  it('toma el DSN cuando está', () => {
    expect(loadEnv({ ...base, SENTRY_DSN: 'https://k@o.ingest.sentry.io/1' }).SENTRY_DSN).toBe(
      'https://k@o.ingest.sentry.io/1',
    )
  })

  it('el ambiente por defecto es development, para no ensuciar producción desde una laptop', () => {
    expect(loadEnv(base).SENTRY_ENVIRONMENT).toBe('development')
  })
})

describe('loadEnv con autenticación', () => {
  it('sin AUTH_SECRET no arranca: una sesión firmada con nada no es una sesión', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgresql://x' })).toThrow(/AUTH_SECRET/)
  })

  it('un secreto corto tampoco sirve, y falla al arrancar y no en la primera sesión', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgresql://x', AUTH_SECRET: 'corto' })).toThrow(
      /AUTH_SECRET/,
    )
  })

  it('la URL base por defecto es la del desarrollo local', () => {
    expect(loadEnv(base).AUTH_BASE_URL).toBe('http://localhost:3000')
  })
})
