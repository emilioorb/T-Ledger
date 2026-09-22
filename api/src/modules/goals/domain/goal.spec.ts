import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import type { Contribution } from './contribution.js'
import { Goal, type GoalProps } from './goal.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const aporte = (date: string, minorUnits: bigint): Contribution => ({
  id: `c-${date}`,
  date: utc(date),
  amount: crc(minorUnits),
})

const aporteUsd = (date: string, minorUnits: bigint): Contribution => ({
  id: `usd-${date}`,
  date: utc(date),
  amount: Money.fromMinorUnits(minorUnits, 'USD'),
})

const props: GoalProps = {
  id: 'europa',
  name: 'Europa',
  target: crc(5_000_000_00n),
  desiredDate: utc('2027-09-01'),
  priority: 1,
  accountCode: null,
  contributions: [],
}

const meta = (contributions: Contribution[] = []) =>
  unwrap(Goal.create({ ...props, contributions }))

describe('Goal', () => {
  it('reporta lo aportado y lo que falta', () => {
    const g = meta([aporte('2026-09-01', 1_000_000_00n), aporte('2026-10-01', 500_000_00n)])

    expect(g.contributed().minorUnits).toBe(1_500_000_00n)
    expect(g.remaining().minorUnits).toBe(3_500_000_00n)
  })

  it('reporta el avance como porcentaje', () => {
    expect(
      meta([aporte('2026-09-01', 1_250_000_00n)])
        .progress()
        .value.toNumber(),
    ).toBe(25)
  })

  it('deriva el aporte mensual requerido para llegar a la fecha deseada', () => {
    // Faltan 5.000.000 y quedan 12 meses desde septiembre de 2026.
    expect(meta().requiredMonthlyContribution(utc('2026-09-01')).minorUnits).toBe(416_666_67n)
  })

  it('el requerido baja a medida que se aporta', () => {
    const g = meta([aporte('2026-09-01', 2_000_000_00n)])
    expect(g.requiredMonthlyContribution(utc('2026-09-01')).minorUnits).toBe(250_000_00n)
  })

  it('proyecta la fecha real según el ritmo observado', () => {
    // Tres meses aportando 500.000: el ritmo es 500.000 al mes y faltan 3.500.000,
    // o sea siete meses más desde enero de 2027.
    const g = meta([
      aporte('2026-10-01', 500_000_00n),
      aporte('2026-11-01', 500_000_00n),
      aporte('2026-12-01', 500_000_00n),
    ])

    expect(g.projectedDate(utc('2027-01-01'))?.toISOString().slice(0, 7)).toBe('2027-08')
  })

  it('sin aportes no hay fecha proyectada: no se inventa un ritmo', () => {
    expect(meta().projectedDate(utc('2026-09-01'))).toBeNull()
  })

  it('una meta alcanzada lo reporta y no pide más aportes', () => {
    const g = meta([aporte('2026-09-01', 5_000_000_00n)])

    expect(g.isReached()).toBe(true)
    expect(g.remaining().isZero()).toBe(true)
    expect(g.requiredMonthlyContribution(utc('2026-09-01')).isZero()).toBe(true)
  })

  it('una fecha deseada ya pasada exige el saldo completo de una vez', () => {
    expect(meta().requiredMonthlyContribution(utc('2028-01-01')).minorUnits).toBe(5_000_000_00n)
  })

  it('rechaza un objetivo no positivo y un aporte de otra moneda', () => {
    expect(isErr(Goal.create({ ...props, target: crc(0n) }))).toBe(true)
    expect(isErr(meta().addContribution(aporteUsd('2026-09-01', 100n)))).toBe(true)
  })

  it('aportar de más no pasa del objetivo en el avance', () => {
    expect(
      meta([aporte('2026-09-01', 9_000_000_00n)])
        .progress()
        .value.toNumber(),
    ).toBe(100)
  })

  it('un aporte nuevo devuelve una meta nueva, sin tocar la anterior', () => {
    const original = meta([aporte('2026-09-01', 1_000_000_00n)])
    const conAporte = unwrap(original.addContribution(aporte('2026-10-01', 500_000_00n)))

    expect(original.contributed().minorUnits).toBe(1_000_000_00n)
    expect(conAporte.contributed().minorUnits).toBe(1_500_000_00n)
  })
})
