import { describe, expect, it, vi } from 'vitest'
import { CLAVE_DE_SESION } from '@/features/identity/recuerdo-de-sesion'
import { CLAVE_DEL_TEMA_DE_ENTRADA } from '@/lib/theme'
import script from '../../public/antes-de-pintar.js?raw'

// El script del <head> corre antes que la app y no puede importar nada: se ejecuta acá tal cual,
// con un location, un localStorage y un <html> de mentira.
const correr = ({ ruta = '/', guardado = {} as Record<string, string>, almacenamientoRoto = false } = {}) => {
  const raiz = document.createElement('html')
  const location = { pathname: ruta, replace: vi.fn() }
  const localStorage = {
    getItem: (clave: string) => {
      if (almacenamientoRoto) throw new Error('SecurityError')
      return guardado[clave] ?? null
    },
  }
  new Function('location', 'localStorage', 'document', script)(location, localStorage, { documentElement: raiz })
  return { raiz, location }
}

describe('antes-de-pintar.js', () => {
  it('abre la portada en claro si nadie eligió tema', () => {
    expect(correr().raiz.dataset.theme).toBe('light')
  })

  it('respeta el tema oscuro guardado con la clave de theme.ts', () => {
    const { raiz } = correr({ guardado: { [CLAVE_DEL_TEMA_DE_ENTRADA]: 'dark' } })

    expect(raiz.dataset.theme).toBe('dark')
  })

  it('manda al tablero a quien tuvo sesión, con la clave de recuerdo-de-sesion.ts, sin mostrar la portada', () => {
    const { raiz, location } = correr({ guardado: { [CLAVE_DE_SESION]: '1' } })

    expect(location.replace).toHaveBeenCalledWith('/tablero')
    expect(raiz.style.visibility).toBe('hidden')
    // El contrato con main.tsx: con esta marca no arranca la app.
    expect(raiz.dataset.redirigiendo).toBeDefined()
  })

  it('solo actúa en la portada: en otra ruta redirigir al tablero sería un bucle', () => {
    const { raiz, location } = correr({ ruta: '/tablero', guardado: { [CLAVE_DE_SESION]: '1' } })

    expect(location.replace).not.toHaveBeenCalled()
    expect(raiz.dataset.theme).toBeUndefined()
  })

  it('sin almacenamiento (Safari privado) no rompe: la portada en claro', () => {
    expect(correr({ almacenamientoRoto: true }).raiz.dataset.theme).toBe('light')
  })
})
