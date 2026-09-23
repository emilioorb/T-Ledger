import { describe, expect, it } from 'vitest'
import { metasPendientes } from './metas-pendientes'

const meta = (id: string, reached: boolean, active: boolean) => ({ id, reached, active })

describe('metasPendientes', () => {
  it('son las activas que todavía no llegaron', () => {
    const metas = [meta('europa', false, true), meta('camara', true, true), meta('rav4', false, false)]
    expect(metasPendientes(metas).map((m) => m.id)).toEqual(['europa'])
  })
})
