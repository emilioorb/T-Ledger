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

// El pedido no llegó al servidor: sin red, DNS, servidor inalcanzable. Es distinto de una
// respuesta de error, y distinto de un TypeError del código, que también es TypeError.
export class ErrorDeRed extends Error {
  constructor(cause?: unknown) {
    super('No se pudo llegar al servidor', { cause })
    this.name = 'ErrorDeRed'
  }
}

// Marca la falta de red en el único punto donde se la puede saber con certeza: un `fetch` que
// rechaza no llegó a tener respuesta. Adivinarla después por el tipo o el mensaje del error
// confundía bugs del código con cortes de red.
export const fetchAlServidor: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    throw new ErrorDeRed(error)
  }
}

// Otra persona guardó antes sobre lo mismo (6b): hay que cargar lo último antes de volver a
// guardar. Distinto de REINTENTAR, que es un cruce momentáneo y se arregla con solo probar de nuevo.
export const esEditadoPorOtro = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === 'EDITADO_POR_OTRO'

export const esReintentar = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === 'REINTENTAR'

// Qué versión de la app hizo el pedido: la API cuenta cuántos pedidos llegan sin `version` y de
// qué versiones, para saber cuándo la puede volver obligatoria.
export const CABECERA_DE_VERSION = 'x-version-cliente'

const isApiErrorBody =(value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof (value as ApiErrorBody).error?.message === 'string'

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  // Con FormData el navegador pone su propio content-type con el boundary: fijarlo a mano
  // rompería la subida del archivo.
  const isFormData = init?.body instanceof FormData
  const response = await fetchAlServidor(`/api/v1${path}`, {
    ...init,
    headers: isFormData
      ? { [CABECERA_DE_VERSION]: __APP_VERSION__, ...init?.headers }
      : { 'content-type': 'application/json', [CABECERA_DE_VERSION]: __APP_VERSION__, ...init?.headers },
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
