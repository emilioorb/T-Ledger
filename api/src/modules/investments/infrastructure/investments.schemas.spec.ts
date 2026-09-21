import { describe, expect, it } from 'vitest'
import { createInvestmentSchema, updateInvestmentSchema } from './investments.schemas.js'

describe('esquemas de inversiones', () => {
  it('renombrar una inversión no borra su cuenta ni su vencimiento', () => {
    expect(updateInvestmentSchema.parse({ name: 'Certificado BN 12 meses' })).toEqual({
      name: 'Certificado BN 12 meses',
    })
  })

  it('una inversión nueva queda sin cuenta contable y sin vencimiento', () => {
    const inversion = createInvestmentSchema.parse({
      name: 'Certificado BN',
      principal: { minorUnits: '100000000', currency: 'CRC' },
      annualRate: '6.5',
      compounding: 'MONTHLY',
      openedAt: '2026-09-01',
      kind: 'OPEN',
    })

    expect(inversion.accountCode).toBeNull()
    expect(inversion.maturesAt).toBeNull()
  })
})
