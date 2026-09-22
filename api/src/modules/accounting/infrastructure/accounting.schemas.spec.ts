import { describe, expect, it } from 'vitest'
import {
  createAccountSchema,
  createCategorySchema,
  createMovementSchema,
  updateAccountSchema,
  updateCategorySchema,
  updateMovementSchema,
} from './accounting.schemas.js'

describe('esquemas de actualización', () => {
  it('renombrar una cuenta no toca el resto de los campos', () => {
    expect(updateAccountSchema.parse({ name: 'Caja renombrada' })).toEqual({
      name: 'Caja renombrada',
    })
  })

  it('renombrar una categoría no toca el resto de los campos', () => {
    expect(updateCategorySchema.parse({ name: 'Mercado' })).toEqual({ name: 'Mercado' })
  })

  it('cambiar la fecha de un movimiento no toca el resto de los campos', () => {
    expect(updateMovementSchema.parse({ date: '2026-09-21' })).toEqual({ date: '2026-09-21' })
  })
})

// El comprobante ya no viaja en el cuerpo del movimiento: se sube como archivo y la clave la
// arma el servidor. Los casos que probaban que una URL `javascript:` no pasara se fueron con
// el campo, porque ahora no hay ninguna URL que alguien pueda escribir.

describe('esquemas de creación', () => {
  it('una cuenta nueva sin jerarquía queda activa, en la raíz y de primera', () => {
    expect(
      createAccountSchema.parse({ code: '1101', name: 'Caja', accountClass: 'ASSET' }),
    ).toEqual({
      code: '1101',
      name: 'Caja',
      accountClass: 'ASSET',
      parentCode: null,
      active: true,
      sortOrder: 0,
    })
  })

  it('una categoría nueva queda activa, sin cuenta contable y sin color elegido', () => {
    expect(createCategorySchema.parse({ name: 'Mercado', kind: 'EXPENSE' })).toEqual({
      name: 'Mercado',
      kind: 'EXPENSE',
      accountCode: null,
      sortOrder: 0,
      active: true,
      // Sin color no es un error: la pantalla le da el que le toca, y quien quiera elegirlo
      // lo elige después.
      colorIndex: null,
    })
  })

  it('no acepta un color fuera de los diez', () => {
    // Un número de más pintaría con una variable CSS que no existe, y eso no se ve como un
    // error: se ve como un punto transparente.
    expect(() =>
      createCategorySchema.parse({ name: 'M', kind: 'EXPENSE', colorIndex: 11 }),
    ).toThrow()
    expect(() =>
      createCategorySchema.parse({ name: 'M', kind: 'EXPENSE', colorIndex: 0 }),
    ).toThrow()
  })

  it('un movimiento nuevo queda sin cuenta de pago ni comprobante', () => {
    const movimiento = createMovementSchema.parse({
      date: '2026-09-21',
      kind: 'EXPENSE',
      categoryId: 'cat-1',
      counterparty: 'Automercado',
      amount: { minorUnits: '1000000', currency: 'CRC' },
    })

    expect(movimiento.paymentAccountCode).toBeNull()
  })
})
