import { describe, expect, it } from 'vitest'
import { createGoalSchema, updateGoalSchema } from './goals.schemas.js'

describe('esquemas de metas', () => {
  it('renombrar una meta no borra su cuenta de ahorro ni su prioridad', () => {
    expect(updateGoalSchema.parse({ name: 'Europa 2027' })).toEqual({ name: 'Europa 2027' })
  })

  it('una meta nueva queda sin cuenta de ahorro y de última', () => {
    const meta = createGoalSchema.parse({
      name: 'Europa',
      target: { minorUnits: '500000000', currency: 'CRC' },
      desiredDate: '2027-09-01',
    })

    expect(meta.accountCode).toBeNull()
    expect(meta.priority).toBe(0)
  })
})
