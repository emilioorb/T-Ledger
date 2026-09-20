import { describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { Debt } from './debt.js'
import {
  AvalancheStrategy,
  ManualOrderStrategy,
  SnowballStrategy,
  payoffStrategyFor,
} from './payoff-strategy.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const AT = utc('2026-01-01')

const debt = (id: string, principalMinor: bigint, annualPercentage: number) =>
  unwrap(
    Debt.create({
      id,
      name: id,
      counterparty: id,
      principal: crc(principalMinor),
      rate: unwrap(InterestRate.create(annualPercentage, 'MONTHLY')),
      termMonths: 24,
      startDate: utc('2026-01-15'),
      kind: 'FRENCH',
      direction: 'BORROWED',
      budgetBucket: 'necesidades',
    }),
  )

const conape = debt('conape', 50_000_000n, 9)
const tarjeta = debt('tarjeta', 8_000_000n, 42)
const papas = debt('papas', 20_000_000n, 0)
const prestado = unwrap(
  Debt.create({
    ...conape.toProps(),
    id: 'andres',
    name: 'Préstamo a Andrés',
    counterparty: 'Andrés',
    direction: 'LENT',
    budgetBucket: null,
  }),
)

describe('AvalancheStrategy', () => {
  it('ataca primero la tasa más alta', () => {
    const ordered = new AvalancheStrategy().order([conape, papas, tarjeta], AT)
    expect(ordered.map((d) => d.id)).toEqual(['tarjeta', 'conape', 'papas'])
  })
})

describe('SnowballStrategy', () => {
  it('ataca primero el saldo más chico', () => {
    const ordered = new SnowballStrategy().order([conape, papas, tarjeta], AT)
    expect(ordered.map((d) => d.id)).toEqual(['tarjeta', 'papas', 'conape'])
  })
})

describe('ManualOrderStrategy', () => {
  it('respeta el orden declarado', () => {
    const ordered = new ManualOrderStrategy(['papas', 'tarjeta', 'conape']).order(
      [conape, papas, tarjeta],
      AT,
    )
    expect(ordered.map((d) => d.id)).toEqual(['papas', 'tarjeta', 'conape'])
  })

  it('manda al final las deudas no listadas, sin perderlas', () => {
    const ordered = new ManualOrderStrategy(['tarjeta']).order([conape, papas, tarjeta], AT)
    expect(ordered[0]?.id).toBe('tarjeta')
    expect(ordered).toHaveLength(3)
  })
})

describe('todas las estrategias', () => {
  it('no mutan la lista recibida ni pierden deudas', () => {
    const input = [conape, papas, tarjeta]
    for (const strategy of [new AvalancheStrategy(), new SnowballStrategy(), new ManualOrderStrategy([])]) {
      const ordered = strategy.order(input, AT)
      expect(ordered).toHaveLength(3)
      expect(input.map((d) => d.id)).toEqual(['conape', 'papas', 'tarjeta'])
    }
  })

  it('dejan al final las deudas ya saldadas a la fecha dada', () => {
    const ordered = new AvalancheStrategy().order([conape, tarjeta], utc('2040-01-01'))
    expect(ordered).toHaveLength(2)
  })

  it('ignoran los préstamos otorgados: no compiten por el excedente', () => {
    for (const strategy of [
      new AvalancheStrategy(),
      new SnowballStrategy(),
      new ManualOrderStrategy(['andres', 'tarjeta']),
    ]) {
      const ordered = strategy.order([conape, prestado, tarjeta], AT)
      expect(ordered.map((d) => d.id)).not.toContain('andres')
      expect(ordered).toHaveLength(2)
    }
  })
})

describe('payoffStrategyFor', () => {
  it('resuelve cada identificador a su implementación', () => {
    expect(payoffStrategyFor('avalanche')).toBeInstanceOf(AvalancheStrategy)
    expect(payoffStrategyFor('snowball')).toBeInstanceOf(SnowballStrategy)
    expect(payoffStrategyFor('manual', ['tarjeta'])).toBeInstanceOf(ManualOrderStrategy)
  })
})
