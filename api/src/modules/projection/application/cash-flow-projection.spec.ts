import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { Debt } from '../../debts/domain/debt.js'
import type { DebtRepository } from '../../debts/domain/debt-repository.port.js'
import { Goal } from '../../goals/domain/goal.js'
import type { GoalRepository } from '../../goals/domain/goal-repository.port.js'
import { Investment } from '../../investments/domain/investment.js'
import type { InvestmentRepository } from '../../investments/domain/investment-repository.port.js'
import type { BudgetIncomeRepository } from '../../budget/domain/budget-income-repository.port.js'
import { CashFlowProjectionUseCase } from './cash-flow-projection.use-case.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// Tres cuotas mensuales desde enero de 2026: la primera vence en febrero.
const deudaDe3Cuotas = (direction: 'BORROWED' | 'LENT' = 'BORROWED') =>
  unwrap(
    Debt.create({
      id: 'corto',
      name: 'Préstamo corto',
      counterparty: 'Banco',
      principal: crc(10_000_00n),
      rate: unwrap(InterestRate.create(12, 'MONTHLY')),
      termMonths: 3,
      startDate: utc('2026-01-01'),
      kind: 'FRENCH',
      direction,
      // Una deuda propia consume una cubeta; un préstamo otorgado no puede declararla.
      budgetBucket: direction === 'BORROWED' ? 'necesidades' : null,
    }),
  )

const metaConAporteMensual = (minorUnits: bigint) =>
  unwrap(
    Goal.create({
      id: 'meta',
      name: 'Fondo',
      // Doce meses desde febrero: el aporte requerido mensual es el objetivo entre doce.
      target: crc(minorUnits * 12n),
      desiredDate: utc('2027-02-01'),
      priority: 1,
      accountCode: null,
      contributions: [],
    }),
  )

const inversionQueVenceEnMarzo = () =>
  unwrap(
    Investment.create({
      id: 'plazo',
      name: 'Certificado',
      principal: crc(1_000_000n),
      rate: unwrap(InterestRate.create(12, 'MONTHLY')),
      openedAt: utc('2026-01-15'),
      kind: 'FIXED_TERM',
      maturesAt: utc('2026-03-15'),
      accountCode: null,
      contributions: [],
    }),
  )

let debts: { findAll: ReturnType<typeof vi.fn> }
let goals: { findAll: ReturnType<typeof vi.fn> }
let investments: { findAll: ReturnType<typeof vi.fn> }
let incomes: { find: ReturnType<typeof vi.fn>; findLatestUpTo: ReturnType<typeof vi.fn> }
let useCase: CashFlowProjectionUseCase

beforeEach(() => {
  debts = { findAll: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }) }
  goals = { findAll: vi.fn().mockResolvedValue([]) }
  investments = { findAll: vi.fn().mockResolvedValue([]) }
  incomes = {
    find: vi.fn().mockResolvedValue(null),
    findLatestUpTo: vi.fn().mockResolvedValue(null),
  }

  useCase = new CashFlowProjectionUseCase(
    debts as unknown as DebtRepository,
    goals as unknown as GoalRepository,
    investments as unknown as InvestmentRepository,
    incomes as unknown as BudgetIncomeRepository,
  )
})

describe('CashFlowProjectionUseCase', () => {
  it('proyecta la cantidad de meses pedida, empezando por el actual', async () => {
    const flow = await useCase.execute(6, utc('2026-09-01'))

    expect(flow).toHaveLength(6)
    expect(flow[0]).toMatchObject({ year: 2026, month: 9 })
    expect(flow[5]).toMatchObject({ year: 2027, month: 2 })
  })

  it('la cuota de una deuda propia es egreso comprometido', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })

    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.debtPayments.isZero()).toBe(false)
    expect(flow[0]?.committed.minorUnits).toBe(flow[0]?.debtPayments.minorUnits)
  })

  it('la cuota de un préstamo otorgado es ingreso, no egreso', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas('LENT')], totalItems: 1 })

    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.lentCollections.isZero()).toBe(false)
    expect(flow[0]?.debtPayments.isZero()).toBe(true)
    expect(flow[0]?.income.minorUnits).toBe(flow[0]?.lentCollections.minorUnits)
  })

  it('reporta qué cuotas se liberan y en qué mes', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })

    const flow = await useCase.execute(6, utc('2026-02-01'))

    // Cuotas en febrero, marzo y abril: la plata queda libre en mayo.
    expect(flow[2]?.freed).toEqual([])
    expect(flow[3]?.freed.map((freed) => freed.name)).toEqual(['Préstamo corto'])
    expect(flow[3]?.freed[0]?.amount.isZero()).toBe(false)
  })

  it('el mes siguiente a liberarse una cuota tiene más excedente', async () => {
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })

    const flow = await useCase.execute(6, utc('2026-02-01'))

    expect(flow[3]!.surplus.minorUnits).toBeGreaterThan(flow[2]!.surplus.minorUnits)
  })

  it('el vencimiento de una inversión entra como ingreso en su mes', async () => {
    investments.findAll.mockResolvedValue([inversionQueVenceEnMarzo()])

    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.maturingInvestments.isZero()).toBe(true)
    expect(BigInt(flow[1]?.maturingInvestments.minorUnits ?? 0n)).toBeGreaterThan(0n)
  })

  it('los aportes a metas son egreso comprometido', async () => {
    goals.findAll.mockResolvedValue([metaConAporteMensual(200_000_00n)])

    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[0]?.goalContributions.minorUnits).toBe(200_000_00n)
    expect(flow[0]?.committed.minorUnits).toBe(200_000_00n)
  })

  it('el excedente es ingreso menos comprometido, y puede ser negativo', async () => {
    goals.findAll.mockResolvedValue([metaConAporteMensual(200_000_00n)])

    const flow = await useCase.execute(1, utc('2026-02-01'))
    const mes = flow[0]!

    expect(mes.surplus.minorUnits).toBe(mes.income.minorUnits - mes.committed.minorUnits)
    expect(mes.surplus.isNegative()).toBe(true)
  })

  it('el ingreso declarado del mes entra en la proyección', async () => {
    incomes.find.mockResolvedValue({ amount: crc(1_000_000_00n) })

    const flow = await useCase.execute(1, utc('2026-02-01'))

    expect(flow[0]?.income.minorUnits).toBe(1_000_000_00n)
  })

  it('arrastra el último ingreso declarado a los meses que todavía no se declararon', async () => {
    incomes.find.mockResolvedValue(null)
    incomes.findLatestUpTo.mockResolvedValue({ amount: crc(800_000_00n) })

    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow[2]?.income.minorUnits).toBe(800_000_00n)
    expect(flow[2]?.incomeDeclared).toBe(false)
  })

  it('cada moneda se proyecta por separado: una meta en dólares no rompe la vista en colones', async () => {
    const enDolares = unwrap(
      Goal.create({
        id: 'carro',
        name: 'Carro',
        target: Money.fromMinorUnits(1_200_000n, 'USD'),
        desiredDate: utc('2027-02-01'),
        priority: 1,
        accountCode: null,
        contributions: [],
      }),
    )
    goals.findAll.mockResolvedValue([metaConAporteMensual(1_000n), enDolares])
    debts.findAll.mockResolvedValue({ items: [deudaDe3Cuotas()], totalItems: 1 })
    incomes.find.mockResolvedValue({ amount: Money.fromMinorUnits(500_000n, 'USD') })

    const enColones = await useCase.execute(3, utc('2026-02-01'), 'CRC')
    const enUsd = await useCase.execute(3, utc('2026-02-01'), 'USD')

    expect(enColones[0]?.goalContributions).toEqual(crc(1_000n))
    expect(enColones[0]?.debtPayments.isZero()).toBe(false)
    expect(enColones[0]?.income.isZero()).toBe(true)
    expect(enColones[0]?.incomeDeclared).toBe(false)
    expect(enUsd[0]?.goalContributions.currency).toBe('USD')
    expect(enUsd[0]?.goalContributions.isZero()).toBe(false)
    expect(enUsd[0]?.debtPayments.isZero()).toBe(true)
    expect(enUsd[0]?.income).toEqual(Money.fromMinorUnits(500_000n, 'USD'))
  })

  it('sin nada cargado proyecta meses en cero, no falla', async () => {
    const flow = await useCase.execute(3, utc('2026-02-01'))

    expect(flow).toHaveLength(3)
    expect(flow[0]?.committed.isZero()).toBe(true)
    expect(flow[0]?.income.isZero()).toBe(true)
  })

  it('rechaza una cantidad de meses no positiva o excesiva', async () => {
    await expect(useCase.execute(0)).rejects.toThrow()
    await expect(useCase.execute(1000)).rejects.toThrow()
  })
})
