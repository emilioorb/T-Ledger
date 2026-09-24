import { describe, expect, it } from 'vitest'
import { esChoqueDeTransaccion } from './choque-de-transaccion.js'

const conCausa = (cause: unknown) => Object.assign(new Error('falló el commit'), { cause })

describe('esChoqueDeTransaccion', () => {
  it('reconoce el código de Prisma para un choque o un deadlock', () => {
    expect(esChoqueDeTransaccion(Object.assign(new Error('x'), { code: 'P2034' }))).toBe(true)
  })

  it('reconoce el sqlState de Postgres, en el error o más adentro en la causa', () => {
    // La forma que describe la documentación de Prisma.
    expect(esChoqueDeTransaccion({ sqlState: '40001' })).toBe(true)
    expect(esChoqueDeTransaccion(conCausa({ sqlState: '40P01' }))).toBe(true)
    expect(esChoqueDeTransaccion(conCausa(conCausa({ sqlState: '40001' })))).toBe(true)
  })

  it('reconoce la forma que entrega el adapter de Postgres cuando el choque aparece en el COMMIT', () => {
    // Medido contra Postgres real: `DriverAdapterError` con esta causa.
    const delAdapter = conCausa({ kind: 'TransactionWriteConflict', originalCode: '40001' })
    expect(esChoqueDeTransaccion(delAdapter)).toBe(true)
    expect(esChoqueDeTransaccion(conCausa({ originalCode: '40P01' }))).toBe(true)
  })

  it('no confunde otros errores con un choque', () => {
    expect(esChoqueDeTransaccion(new Error('otra cosa'))).toBe(false)
    expect(esChoqueDeTransaccion(Object.assign(new Error('x'), { code: 'P2002' }))).toBe(false)
    expect(esChoqueDeTransaccion(conCausa({ sqlState: '23505' }))).toBe(false)
    expect(esChoqueDeTransaccion(null)).toBe(false)
    expect(esChoqueDeTransaccion('40001')).toBe(false)
  })
})
