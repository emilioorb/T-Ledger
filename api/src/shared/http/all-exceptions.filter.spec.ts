import { HttpException } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditadoPorOtroError, NotFoundError } from './api-error.js'
import { ChoqueDeTransaccionError } from '../prisma/choque-de-transaccion.js'

const captureException = vi.fn()
vi.mock('@sentry/node', () => ({ captureException: (error: unknown) => captureException(error) }))

const { AllExceptionsFilter } = await import('./all-exceptions.filter.js')

const hostFalso = (): ArgumentsHost =>
  ({
    switchToHttp: () => ({ getResponse: () => ({ status: () => ({ json: () => undefined }) }) }),
  }) as unknown as ArgumentsHost

interface Respuesta {
  status: number
  body: { error: { code: string; message: string } }
}

// Devuelve lo que el filtro le contestaría al cliente.
const responder = (exception: unknown): Respuesta => {
  const respuesta: Respuesta = { status: 0, body: { error: { code: '', message: '' } } }
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (status: number) => {
          respuesta.status = status
          return { json: (body: Respuesta['body']) => (respuesta.body = body) }
        },
      }),
    }),
  } as unknown as ArgumentsHost
  new AllExceptionsFilter().catch(exception, host)
  return respuesta
}

const errorDePrisma = (code: string) =>
  Object.assign(new Error(`falló con ${code}`), { name: 'PrismaClientKnownRequestError', code })

describe('AllExceptionsFilter y Sentry', () => {
  beforeEach(() => captureException.mockClear())

  it('reporta lo que termina en 500, que es lo que nadie esperaba', () => {
    const roto = new Error('la base se cayó')
    new AllExceptionsFilter().catch(roto, hostFalso())

    expect(captureException).toHaveBeenCalledWith(roto)
  })

  it('no reporta un 404: que alguien pida algo que no existe no es una falla del sistema', () => {
    new AllExceptionsFilter().catch(new NotFoundError('El movimiento no existe'), hostFalso())

    expect(captureException).not.toHaveBeenCalled()
  })

  it('no reporta un 400: el cliente mandó mal los datos y ya se le dijo', () => {
    new AllExceptionsFilter().catch(new HttpException('mal', 400), hostFalso())

    expect(captureException).not.toHaveBeenCalled()
  })
})

describe('AllExceptionsFilter y la concurrencia', () => {
  beforeEach(() => captureException.mockClear())

  it('algo que cambió mientras se editaba es un 409 propio, que no culpa a nadie', () => {
    const { status, body } = responder(new EditadoPorOtroError())

    expect(status).toBe(409)
    expect(body.error.code).toBe('EDITADO_POR_OTRO')
    expect(body.error.message).toMatch(/cambió mientras lo editabas/)
    expect(body.error.message).not.toMatch(/otra persona|alguien/)
  })

  it('un cruce que no se resolvió reintentando pide probar de nuevo, con su propio código', () => {
    const { status, body } = responder(new ChoqueDeTransaccionError(new Error('40001')))

    expect(status).toBe(409)
    expect(body.error.code).toBe('REINTENTAR')
  })

  it('un choque de unicidad de la base es un 409 y no un 500', () => {
    expect(responder(errorDePrisma('P2002'))).toMatchObject({ status: 409, body: { error: { code: 'CONFLICT' } } })
  })

  it('una fila que ya no está es un 404 y no un 500', () => {
    expect(responder(errorDePrisma('P2025'))).toMatchObject({ status: 404, body: { error: { code: 'NOT_FOUND' } } })
  })

  it('ninguno de estos llega a Sentry: son el sistema funcionando con dos personas a la vez', () => {
    for (const error of [
      new EditadoPorOtroError(),
      new ChoqueDeTransaccionError(null),
      errorDePrisma('P2002'),
      errorDePrisma('P2025'),
    ]) {
      responder(error)
    }

    expect(captureException).not.toHaveBeenCalled()
  })
})
