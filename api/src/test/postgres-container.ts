import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { inject } from 'vitest'
import { PLANTILLA } from './global-setup.js'

export interface RunningPostgres {
  url: string
  stop: () => Promise<void>
}

// Una base propia por archivo, clonada de la plantilla que migró y sembró el setup global: ya
// trae el esquema, el libro de prueba, su dueño y el plan de cuentas. Clonar es copiar archivos
// dentro del mismo servidor, mucho más barato que levantar un contenedor y migrarlo.
export const startPostgres = async (): Promise<RunningPostgres> => {
  const servidor = inject('postgresServidor')
  const base = `prueba_${randomUUID().replaceAll('-', '')}`

  const admin = new pg.Client({ connectionString: servidor })
  await admin.connect()
  await admin.query(`CREATE DATABASE "${base}" TEMPLATE "${PLANTILLA}"`)
  await admin.end()

  const url = new URL(servidor)
  url.pathname = `/${base}`

  return {
    url: url.toString(),
    stop: async () => {
      const cierre = new pg.Client({ connectionString: servidor })
      await cierre.connect()
      await cierre.query(`DROP DATABASE IF EXISTS "${base}" WITH (FORCE)`)
      await cierre.end()
    },
  }
}
