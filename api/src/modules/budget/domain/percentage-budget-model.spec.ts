import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import type { CategorizedSpending } from './categorized-spending.js'
import { FIFTY_THIRTY_TWENTY, PercentageBudgetModel } from './percentage-budget-model.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const pct = (value: number) => unwrap(Percentage.create(value))

const spending = (amounts: Record<string, bigint>): CategorizedSpending => ({
  amountFor: (bucketId) => crc(amounts[bucketId] ?? 0n),
})

const modelo = () => unwrap(PercentageBudgetModel.create(FIFTY_THIRTY_TWENTY))

describe('PercentageBudgetModel', () => {
  it('reparte el ingreso según los porcentajes', () => {
    const evaluation = modelo().evaluate(crc(100_000_00n), spending({}))

    expect(evaluation.buckets.map((b) => [b.bucketId, b.allocated.minorUnits])).toEqual([
      ['necesidades', 50_000_00n],
      ['deseos', 30_000_00n],
      ['ahorro', 20_000_00n],
    ])
  })

  it('el reparto cuadra exactamente en un ingreso no divisible', () => {
    const evaluation = modelo().evaluate(crc(1_000_001n), spending({}))
    const total = evaluation.buckets.reduce((acc, b) => acc + b.allocated.minorUnits, 0n)

    expect(total).toBe(1_000_001n)
  })

  it('reporta la desviación por cubeta y su estado', () => {
    const evaluation = modelo().evaluate(
      crc(100_000_00n),
      spending({ necesidades: 55_000_00n, deseos: 20_000_00n, ahorro: 20_000_00n }),
    )

    const necesidades = evaluation.buckets[0]
    expect(necesidades?.consumed.minorUnits).toBe(55_000_00n)
    expect(necesidades?.deviation.minorUnits).toBe(-5_000_00n)
    expect(necesidades?.status).toBe('OVER')

    expect(evaluation.buckets[1]?.status).toBe('UNDER')
    expect(evaluation.buckets[2]?.status).toBe('ON_TRACK')
  })

  it('reporta el excedente del mes', () => {
    const evaluation = modelo().evaluate(
      crc(100_000_00n),
      spending({ necesidades: 40_000_00n, deseos: 20_000_00n, ahorro: 20_000_00n }),
    )

    expect(evaluation.totalConsumed.minorUnits).toBe(80_000_00n)
    expect(evaluation.surplus.minorUnits).toBe(20_000_00n)
  })

  it('rechaza un modelo cuyos porcentajes no suman 100', () => {
    const result = PercentageBudgetModel.create({
      id: 'roto',
      name: 'No suma',
      buckets: [
        { id: 'a', name: 'A', percentage: pct(50), isSavings: false, colorIndex: null },
        { id: 'b', name: 'B', percentage: pct(30), isSavings: false, colorIndex: null },
      ],
    })

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un modelo sin cubetas o con identificadores repetidos', () => {
    expect(isErr(PercentageBudgetModel.create({ id: 'v', name: 'Vacío', buckets: [] }))).toBe(true)
    expect(
      isErr(
        PercentageBudgetModel.create({
          id: 'd',
          name: 'Duplicado',
          buckets: [
            { id: 'a', name: 'A', percentage: pct(50), isSavings: false, colorIndex: null },
            {
              id: 'a',
              name: 'A otra vez',
              percentage: pct(50),
              isSavings: false,
              colorIndex: null,
            },
          ],
        }),
      ),
    ).toBe(true)
  })

  it('acepta cualquier reparto propio que sume 100, no solo los conocidos', () => {
    const result = PercentageBudgetModel.create({
      id: 'propio',
      name: 'A mi manera',
      buckets: [
        { id: 'fijos', name: 'Fijos', percentage: pct(65), isSavings: false, colorIndex: null },
        { id: 'gustos', name: 'Gustos', percentage: pct(15), isSavings: false, colorIndex: null },
        {
          id: 'patrimonio',
          name: 'Patrimonio',
          percentage: pct(20),
          isSavings: true,
          colorIndex: null,
        },
      ],
    })

    expect(isErr(result)).toBe(false)
  })

  it('exige exactamente una cubeta de ahorro, que es donde caen los abonos extraordinarios', () => {
    expect(
      isErr(
        PercentageBudgetModel.create({
          id: 'sin-ahorro',
          name: 'Sin ahorro',
          buckets: [
            { id: 'a', name: 'A', percentage: pct(50), isSavings: false, colorIndex: null },
            { id: 'b', name: 'B', percentage: pct(50), isSavings: false, colorIndex: null },
          ],
        }),
      ),
    ).toBe(true)
  })
})
