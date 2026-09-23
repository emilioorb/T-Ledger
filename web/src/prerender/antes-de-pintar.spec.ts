import { describe, expect, it } from 'vitest'
import { CLAVE_DE_SESION } from '@/features/identity/recuerdo-de-sesion'
import { CLAVE_DEL_TEMA_DE_ENTRADA } from '@/lib/theme'
import script from '../../public/antes-de-pintar.js?raw'

// El script del <head> no puede importar nada: repite las claves a mano. Esto lo ata al código.
describe('antes-de-pintar.js', () => {
  it('lee la misma marca de sesión que recuerdo-de-sesion.ts', () => {
    expect(script).toContain(`'${CLAVE_DE_SESION}'`)
  })

  it('lee el mismo tema de entrada que theme.ts', () => {
    expect(script).toContain(`'${CLAVE_DEL_TEMA_DE_ENTRADA}'`)
  })

  it('solo actúa en la portada: en otra ruta redirigir al tablero sería un bucle', () => {
    expect(script).toMatch(/location\.pathname !== '\/'/)
  })
})
