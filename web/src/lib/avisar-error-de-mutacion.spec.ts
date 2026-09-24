import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { ApiError } from './api'
import { avisarErrorDeMutacion, avisos } from './avisar-error-de-mutacion'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const editado = new ApiError(409, 'EDITADO_POR_OTRO', 'Esto cambió mientras lo editabas.')

describe('el aviso de una mutación que falló', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  it('«otro guardó antes» ofrece cargar lo último, y al tocarlo recarga', () => {
    const cargarLoUltimo = vi.fn()

    avisarErrorDeMutacion(editado, { tieneSuPropioAviso: false, cargarLoUltimo })

    const [mensaje, opciones] = vi.mocked(toast.error).mock.calls[0]!
    expect(mensaje).toBe('Esto cambió mientras lo editabas.')
    const accion = (opciones as { action: { label: string; onClick: () => void } }).action
    expect(accion.label).toBe(avisos.cargarLoUltimo)
    accion.onClick()
    expect(cargarLoUltimo).toHaveBeenCalledOnce()
  })

  it('«otro guardó antes» se avisa aunque la mutación tenga su propio aviso', () => {
    avisarErrorDeMutacion(editado, { tieneSuPropioAviso: true, cargarLoUltimo: vi.fn() })

    expect(toast.error).toHaveBeenCalledOnce()
  })

  it('el resto no se repite si la mutación ya trae su aviso: antes salían dos toasts', () => {
    avisarErrorDeMutacion(new ApiError(409, 'CONFLICT', 'Mes cerrado'), { tieneSuPropioAviso: true, cargarLoUltimo: vi.fn() })

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('sin aviso propio, el mensaje del servidor, o uno genérico si no hay', () => {
    avisarErrorDeMutacion(new ApiError(422, 'SEMANTIC_VALIDATION_ERROR', 'La fecha es anterior'), {
      tieneSuPropioAviso: false,
      cargarLoUltimo: vi.fn(),
    })
    avisarErrorDeMutacion(new TypeError('x'), { tieneSuPropioAviso: false, cargarLoUltimo: vi.fn() })

    expect(vi.mocked(toast.error).mock.calls.map(([mensaje]) => mensaje)).toEqual(['La fecha es anterior', avisos.fallo])
  })
})
