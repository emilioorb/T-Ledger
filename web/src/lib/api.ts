export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof (value as ApiErrorBody).error?.message === 'string'

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      throw new ApiError(response.status, payload.error.code, payload.error.message, payload.error.details)
    }
    // Un fallo de red o una respuesta ilegible tampoco puede quedar sin mensaje para el toast.
    throw new ApiError(response.status, 'UNKNOWN_ERROR', 'No se pudo completar la operación')
  }

  return payload as T
}
