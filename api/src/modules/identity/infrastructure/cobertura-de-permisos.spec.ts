import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { globSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const raiz = fileURLToPath(new URL('../../../', import.meta.url))
const controladores = globSync('modules/*/infrastructure/*.controller.ts', { cwd: raiz })

// Los tipos de cambio del BCCR son públicos y no cuelgan de ningún libro, así que sus
// endpoints no tienen rol que chequear.
const SIN_PERMISO = ['exchange-rates.controller.ts']

const ESCRIBEN = /@(Post|Patch|Put|Delete)\(/

interface MetodoSinPermiso {
  archivo: string
  linea: number
  verbo: string
}

const metodosDeEscrituraSinPermiso = (): MetodoSinPermiso[] => {
  const sueltos: MetodoSinPermiso[] = []

  for (const relativo of controladores) {
    if (SIN_PERMISO.some((nombre) => relativo.endsWith(nombre))) continue
    const lineas = readFileSync(raiz + relativo, 'utf8').split('\n')

    lineas.forEach((linea, i) => {
      const escribe = linea.match(ESCRIBEN)
      if (!escribe) return
      // El decorador de permiso va pegado al del verbo, arriba o abajo. Se miran tres líneas
      // a cada lado para no depender del orden en que estén escritos.
      const vecindario = lineas.slice(Math.max(0, i - 3), i + 4).join('\n')
      if (!vecindario.includes('@Permiso(')) {
        sueltos.push({ archivo: relativo, linea: i + 1, verbo: escribe[1]! })
      }
    })
  }
  return sueltos
}

// Esta es la guardia de la segunda capa. Sin ella, el endpoint número cuarenta que alguien
// agregue dentro de seis meses va a quedar sin rol que lo cuide, y nadie se va a dar cuenta
// hasta que quien solo debía mirar edite un movimiento.
describe('todo endpoint que escribe declara su permiso', () => {
  it('se encontraron los controladores, si no el test no prueba nada', () => {
    expect(controladores.length).toBeGreaterThan(10)
  })

  it('ningún POST, PATCH, PUT ni DELETE quedó sin @Permiso', () => {
    expect(metodosDeEscrituraSinPermiso()).toEqual([])
  })
})
