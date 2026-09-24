import { describe, expect, it } from 'vitest'
import { calcularCambios } from './cambios.js'

describe('calcularCambios', () => {
  it('no informa nada cuando no cambió nada', () => {
    const antes = { counterparty: 'Súper', amountMinor: 1_000n }

    expect(calcularCambios(antes, { ...antes })).toEqual([])
  })

  it('informa el campo que cambió, con su valor anterior y el nuevo', () => {
    const cambios = calcularCambios({ counterparty: 'Súper' }, { counterparty: 'Automercado' })

    expect(cambios).toEqual([{ campo: 'counterparty', antes: 'Súper', despues: 'Automercado' }])
  })

  it('convierte los montos a texto para que sobrevivan al JSON', () => {
    // `JSON.stringify` lanza «Do not know how to serialize a BigInt». Sin esta conversión el
    // rastro reventaría justo en el campo que más importa de un movimiento: la plata.
    const cambios = calcularCambios({ amountMinor: 1_000n }, { amountMinor: 2_500n })

    expect(cambios).toEqual([{ campo: 'amountMinor', antes: '1000', despues: '2500' }])
    expect(() => JSON.stringify(cambios)).not.toThrow()
  })

  it('compara fechas por su valor y no por identidad', () => {
    const antes = { date: new Date('2026-09-22T00:00:00.000Z') }
    const despues = { date: new Date('2026-09-22T00:00:00.000Z') }

    expect(calcularCambios(antes, despues)).toEqual([])
  })

  it('informa una fecha que sí cambió, en formato ISO', () => {
    const cambios = calcularCambios(
      { date: new Date('2026-09-22T00:00:00.000Z') },
      { date: new Date('2026-09-23T00:00:00.000Z') },
    )

    expect(cambios).toEqual([
      { campo: 'date', antes: '2026-09-22T00:00:00.000Z', despues: '2026-09-23T00:00:00.000Z' },
    ])
  })

  it('ignora el identificador, el libro y las marcas de tiempo', () => {
    const cambios = calcularCambios(
      { id: 'mov_1', bookId: 'lib_1', createdAt: new Date(0), counterparty: 'Súper' },
      { id: 'mov_2', bookId: 'lib_2', createdAt: new Date(1), counterparty: 'Súper' },
    )

    expect(cambios).toEqual([])
  })

  // Sin esto, cada alta mostraba «version: — → 0» en la auditoría.
  it('la versión no es un cambio: la sube la base, nadie la edita', () => {
    expect(calcularCambios({}, { version: 0 })).toEqual([])
    expect(calcularCambios({ version: 3 }, { version: 4 })).toEqual([])
  })

  it('cuenta un campo que aparece', () => {
    const cambios = calcularCambios({}, { receiptKey: 'https://x/y.pdf' })

    expect(cambios).toEqual([{ campo: 'receiptKey', antes: undefined, despues: 'https://x/y.pdf' }])
  })

  it('cuenta un campo que desaparece', () => {
    // Recorrer solo las claves de «después» lo dejaría afuera, y quitar un comprobante es
    // exactamente el tipo de cambio por el que alguien va a mirar el rastro.
    const cambios = calcularCambios({ receiptKey: 'https://x/y.pdf' }, { receiptKey: null })

    expect(cambios).toEqual([{ campo: 'receiptKey', antes: 'https://x/y.pdf', despues: null }])
  })

  it('usa `toJSON` cuando el objeto dice cómo quiere verse', () => {
    // Es el caso de los decimales del dominio: sin esto, una tasa de interés se guardaba con
    // los internos de decimal.js —`{ s, e, d }`— en lugar del número.
    const tasa = (texto: string) => ({ toJSON: () => texto })

    const cambios = calcularCambios({ rate: tasa('12.5') }, { rate: tasa('14') })

    expect(cambios).toEqual([{ campo: 'rate', antes: '12.5', despues: '14' }])
  })

  it('no informa cambio cuando dos objetos serializan igual', () => {
    const tasa = (texto: string) => ({ toJSON: () => texto })

    expect(calcularCambios({ rate: tasa('12.5') }, { rate: tasa('12.5') })).toEqual([])
  })

  it('compara objetos anidados por valor', () => {
    const cambios = calcularCambios(
      { amount: { amountMinor: 1_000n, currency: 'CRC' } },
      { amount: { amountMinor: 1_000n, currency: 'CRC' } },
    )

    expect(cambios).toEqual([])
  })

  it('informa el cambio dentro de un objeto anidado, ya normalizado', () => {
    const cambios = calcularCambios(
      { amount: { amountMinor: 1_000n, currency: 'CRC' } },
      { amount: { amountMinor: 1_000n, currency: 'USD' } },
    )

    expect(cambios).toEqual([
      {
        campo: 'amount',
        antes: { amountMinor: '1000', currency: 'CRC' },
        despues: { amountMinor: '1000', currency: 'USD' },
      },
    ])
  })
})
