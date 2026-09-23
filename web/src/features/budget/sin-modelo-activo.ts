import { ApiError } from '@/lib/api'

// La evaluación del presupuesto contesta 422 cuando el libro no tiene modelo activo. No es una
// falla: es el estado de todo libro recién creado, y cada pantalla lo muestra como vacío con el
// camino para resolverlo, no como una consulta caída.
export const sinModeloActivo = (error: unknown): boolean =>
  error instanceof ApiError && error.code === 'SEMANTIC_VALIDATION_ERROR'
