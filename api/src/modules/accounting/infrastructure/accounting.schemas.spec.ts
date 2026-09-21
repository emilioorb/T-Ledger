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

  it('una categoría nueva queda activa y sin cuenta contable', () => {
    expect(createCategorySchema.parse({ name: 'Mercado', kind: 'EXPENSE' })).toEqual({
      name: 'Mercado',
      kind: 'EXPENSE',
      accountCode: null,
      sortOrder: 0,
      active: true,
    })
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
    expect(movimiento.receiptUrl).toBeNull()
  })
})
