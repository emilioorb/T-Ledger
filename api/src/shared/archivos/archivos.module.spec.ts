import { Logger } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { loadArchivosEnv } from '../config/env.js'
import { almacenamientoDe } from './archivos.module.js'
import { DiscoAdapter } from './disco.adapter.js'
import { R2Adapter } from './r2.adapter.js'

const base = {}

const callado = () => ({ log: vi.fn(), warn: vi.fn() }) as unknown as Logger

// La elección entre el bucket y el disco es de esas que se hacen una vez y se descubren mal
// seis meses después, cuando un despliegue se lleva los comprobantes de alguien. Por eso se
// prueba, y por eso el arranque la dice en voz alta.
describe('dónde se guardan los comprobantes', () => {
  it('con las cuatro credenciales, en R2', () => {
    const env = loadArchivosEnv({
      ...base,
      R2_ACCOUNT_ID: 'cuenta',
      R2_ACCESS_KEY_ID: 'llave',
      R2_SECRET_ACCESS_KEY: 'secreto',
      R2_BUCKET: 'comprobantes',
    } as NodeJS.ProcessEnv)

    expect(almacenamientoDe(env, callado())).toBeInstanceOf(R2Adapter)
  })

  it('sin ninguna, en el disco', () => {
    expect(almacenamientoDe(loadArchivosEnv(base as NodeJS.ProcessEnv), callado())).toBeInstanceOf(
      DiscoAdapter,
    )
  })

  it('con tres de cuatro, en el disco: medio configurado no existe', () => {
    // Un cliente de S3 al que le falta el bucket se construye igual y falla recién al subir
    // el primer archivo, que es el peor momento para enterarse.
    const env = loadArchivosEnv({
      ...base,
      R2_ACCOUNT_ID: 'cuenta',
      R2_ACCESS_KEY_ID: 'llave',
      R2_SECRET_ACCESS_KEY: 'secreto',
    } as NodeJS.ProcessEnv)

    expect(almacenamientoDe(env, callado())).toBeInstanceOf(DiscoAdapter)
  })

  it('avisa en el arranque cuál de los dos quedó', () => {
    const registro = callado()
    almacenamientoDe(loadArchivosEnv(base as NodeJS.ProcessEnv), registro)

    expect(registro.warn).toHaveBeenCalledWith(expect.stringContaining('disco'))
  })
})
