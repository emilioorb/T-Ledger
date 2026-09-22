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

// Los cambios de gente no pasan por un caso de uso: los hace Better Auth desde sus propios
// ganchos, así que la guardia de arriba no los ve. Esta es la misma promesa mirando ese otro
// camino, el que el ADR-004 dejó a medias hasta que se resolvió de dónde sacar al autor.
const authConfig = readFileSync(`${raiz}modules/identity/infrastructure/auth.config.ts`, 'utf8')

// Un gancho de gente: los que hablan de miembros o invitaciones. `beforeCreateOrganization` y
// compañía quedan fuera porque crear un libro no es mover gente.
const GANCHOS_DE_GENTE = /before(\w*(?:Member|Invitation)\w*): async/g

describe('los cambios de gente también dejan rastro', () => {
  const ganchos = [...authConfig.matchAll(GANCHOS_DE_GENTE)].map(([, nombre]) => nombre!)

  it('se encontraron los ganchos, si no este test no prueba nada', () => {
    // Invitar, aceptar, cancelar, cambiar el rol y sacar. Los cinco caminos del ADR-004.
    expect(ganchos).toHaveLength(5)
  })

  it('cada gancho de gente avisa del cambio', () => {
    const mudos = ganchos.filter((nombre) => {
      const desde = authConfig.indexOf(`before${nombre}: async`)
      const siguiente = authConfig.indexOf('before', desde + 10)
      const cuerpo = authConfig.slice(desde, siguiente === -1 ? undefined : siguiente)
      return !cuerpo.includes('alCambiarMiembro')
    })

    expect(mudos).toEqual([])
  })

  it('los dos que firman a quien no es el autor lo piden aparte', () => {
    // `beforeUpdateMemberRole` y `beforeRemoveMember` solo reciben al afectado. Si alguien
    // los «arregla» pasando `user.id` como autor, el registro diría que se degradó solo.
    for (const gancho of ['beforeUpdateMemberRole', 'beforeRemoveMember']) {
      const desde = authConfig.indexOf(`${gancho}: async`)
      const siguiente = authConfig.indexOf('before', desde + 10)
      const cuerpo = authConfig.slice(desde, siguiente === -1 ? undefined : siguiente)

      expect(cuerpo).toContain('exigirAutor')
      expect(cuerpo).not.toContain('autorId: user.id')
    }
  })
})
