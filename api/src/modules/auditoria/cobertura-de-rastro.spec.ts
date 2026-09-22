import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const raiz = fileURLToPath(new URL('../../', import.meta.url))

// Los dominios donde el ADR-004 manda registrar: «donde hay plata o decisiones». El resto de
// los módulos queda fuera a propósito, no por olvido.
const DOMINIOS = ['accounting', 'debts', 'goals', 'investments', 'budget']

const casosDeUso = globSync(`modules/{${DOMINIOS.join(',')}}/application/*.use-case.ts`, {
  cwd: raiz,
}).filter((archivo) => !archivo.endsWith('.spec.ts'))

// Escribe en la base quien guarda, borra o agrega. `seedChart` no entra en esta lista por su
// nombre sino por la de abajo.
const ESCRIBE = /\.(save|saveMany|delete|addContribution)\(/

// Lo que escribe y **no** lleva rastro, con el motivo. Sale del propio ADR-004, que rechazó
// registrar todo lo que escribe porque «entierra la señal entre el ruido de catálogos y
// consultas administrativas».
//
// Cada línea de acá es una decisión que alguien tomó. Agregar una nueva debería costar
// explicarla, que es justo para lo que está la lista.
const SIN_RASTRO: Record<string, string> = {
  'create-journal-entry.use-case.ts':
    'Los asientos ya son inmutables y trazables por `reversesEntryId`: repetirlo sería ruido sobre la parte que menos falta hace.',
  'manage-categories.use-case.ts': 'Catálogo, no plata.',
  'save-account.use-case.ts': 'El plan de cuentas es catálogo.',
  'seed-chart.use-case.ts': 'Siembra inicial de un libro recién creado: no la hizo nadie.',
}

describe('cobertura del rastro de auditoría', () => {
  // El ADR-004 promete que no puede existir un cambio sin su rastro. Sin esta prueba, esa
  // promesa depende de que quien escriba el próximo caso de uso se acuerde —y el día que no
  // se acuerde, nadie se entera hasta que alguien busque en el registro algo que nunca se
  // guardó—. Es el mismo guardia que `cobertura-de-permisos.spec.ts` monta para los roles.
  it('todo caso de uso que escribe en un dominio auditado registra el cambio', () => {
    const sinInstrumentar = casosDeUso.filter((archivo) => {
      const nombre = archivo.split(/[\\/]/).pop() ?? ''
      if (nombre in SIN_RASTRO) return false

      const fuente = readFileSync(`${raiz}${archivo}`, 'utf8')
      return ESCRIBE.test(fuente) && !fuente.includes('this.rastro.registrar')
    })

    expect(sinInstrumentar).toEqual([])
  })

  it('la lista de exclusiones no tiene nombres que ya no existen', () => {
    // Una exclusión que sobrevive al archivo que excluía es una puerta abierta con el cartel
    // de otra puerta.
    const existentes = new Set(casosDeUso.map((archivo) => archivo.split(/[\\/]/).pop()))
    const fantasmas = Object.keys(SIN_RASTRO).filter((nombre) => !existentes.has(nombre))

    expect(fantasmas).toEqual([])
  })
})
