import { toast } from 'sonner'
import { ApiError } from './api'
import { esEditadoPorOtro } from './errores-de-la-api'

export const avisos = {
  fallo: 'No se pudo completar la operación',
  cargarLoUltimo: 'Cargar lo último',
} as const

// El aviso de una mutación que falló. Una mutación no tiene superficie donde contarlo: el toast es
// lo único que ve la persona.
//
// «Otro guardó antes» (6b) se avisa siempre, aunque la mutación tenga su propio aviso, porque
// ofrece lo único que lo resuelve: cargar lo último. El formulario queda abierto con lo que se
// escribió, y al cargar la versión nueva se ve lo que guardó la otra persona antes de decidir.
//
// Si la mutación trae su propio `onError`, el resto lo explica ella: TanStack Query llama al de la
// caché además del suyo, y avisar acá también mostraba dos toasts del mismo error.
export const avisarErrorDeMutacion = (
  error: unknown,
  { tieneSuPropioAviso, cargarLoUltimo }: { tieneSuPropioAviso: boolean; cargarLoUltimo: () => void },
): void => {
  if (esEditadoPorOtro(error)) {
    toast.error(error.message, {
      id: 'editado-por-otro',
      action: { label: avisos.cargarLoUltimo, onClick: cargarLoUltimo },
    })
    return
  }
  if (tieneSuPropioAviso) return
  toast.error(error instanceof ApiError ? error.message : avisos.fallo)
}
