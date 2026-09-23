import { describe, expect, it } from 'vitest'
import { cuotasRestantes } from './cuotas-restantes'

describe('cuotasRestantes', () => {
  it('cuenta las que no están pagadas, atrasadas incluidas', () => {
    const cuotas = [{ status: 'PAID' }, { status: 'OVERDUE' }, { status: 'PENDING' }] as const
    expect(cuotasRestantes(cuotas)).toBe(2)
  })

  it('una deuda saldada no tiene cuotas restantes', () => {
    expect(cuotasRestantes([{ status: 'PAID' }, { status: 'PAID' }])).toBe(0)
  })
})
