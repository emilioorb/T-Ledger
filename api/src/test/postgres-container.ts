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
    // No borra nada: el contenedor entero se va al final de la suite, con todas las bases
    // adentro. Borrarla acá era un `DROP DATABASE ... WITH (FORCE)` por archivo, y con la suite
    // en paralelo —y los hashes de contraseña comiéndose la CPU— pasaba de los diez segundos
    // de un `afterAll` y hacía fallar un archivo cuyos tests habían pasado todos.
    stop: async () => {},
  }
}
