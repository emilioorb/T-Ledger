import { ApiError } from './api'

// Otro guardó antes sobre lo mismo (6b): hay que cargar lo último antes de volver a guardar.
// Distinto de REINTENTAR, que es un cruce momentáneo y se arregla con solo probar de nuevo. Vive
// aparte de `api.ts`, que va en el bundle de entrada: esto solo lo usan las pantallas y el aviso.
export const esEditadoPorOtro = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === 'EDITADO_POR_OTRO'

export const esReintentar = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === 'REINTENTAR'
