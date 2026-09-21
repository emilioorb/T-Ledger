import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import { captureException } from '@sentry/node'
import type { Response } from 'express'
import { ConflictError, NotFoundError, SemanticValidationError } from './api-error.js'

interface ErrorBody {
  error: { code: string; message: string; details?: unknown }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, body } = this.describe(exception)
    // Solo lo que termina en 500 llega a Sentry: un 404 o un 422 son el sistema funcionando,
    // y reportarlos enterraría lo que de verdad se rompió. Este `if` ya era el criterio de
    // «esto es grave» para el log, así que la captura va acá y no en un filtro aparte, que
    // tendría su propia idea de lo mismo. Si no hay DSN, `captureException` no hace nada.
    if (status >= 500) {
      this.logger.error(exception)
      captureException(exception)
    }
    response.status(status).json(body)
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof NotFoundError) {
      return { status: 404, body: { error: { code: exception.code, message: exception.message } } }
    }
    if (exception instanceof ConflictError) {
      return { status: 409, body: { error: { code: exception.code, message: exception.message } } }
    }
    if (exception instanceof SemanticValidationError) {
      return {
        status: 422,
        body: {
          error: { code: exception.code, message: exception.message, details: exception.details },
        },
      }
    }
    if (exception instanceof HttpException) {
      const payload = exception.getResponse()
      const isStructured = typeof payload === 'object' && payload !== null && 'error' in payload
      return {
        status: exception.getStatus(),
        body: isStructured
          ? (payload as ErrorBody)
          : { error: { code: 'HTTP_ERROR', message: exception.message } },
      }
    }
    // Un error no previsto no expone su mensaje: el detalle va al log, no al cliente.
    return {
      status: 500,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } },
    }
  }
}
