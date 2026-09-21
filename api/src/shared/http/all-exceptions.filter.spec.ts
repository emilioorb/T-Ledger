import { HttpException } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from './api-error.js'

const captureException = vi.fn()
vi.mock('@sentry/node', () => ({ captureException: (error: unknown) => captureException(error) }))

const { AllExceptionsFilter } = await import('./all-exceptions.filter.js')

const hostFalso = (): ArgumentsHost =>
  ({
    switchToHttp: () => ({ getResponse: () => ({ status: () => ({ json: () => undefined }) }) }),
  }) as unknown as ArgumentsHost

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
