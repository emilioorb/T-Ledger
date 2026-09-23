import { describe, expect, it, vi } from 'vitest'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import type { UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import type { EntradaDeRastro, Rastro } from '../../auditoria/domain/rastro.port.js'
import type { CreateMovementUseCase } from '../../accounting/application/create-movement.use-case.js'
import type { VoidMovementUseCase } from '../../accounting/application/void-movement.use-case.js'
import type { CreateMovementInput } from '../../accounting/infrastructure/accounting.schemas.js'
import { Debt, type DebtProps } from '../domain/debt.js'
import type { DebtRepository } from '../domain/debt-repository.port.js'
import { PagosDeDeudaUseCase } from './pagos-de-deuda.use-case.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// Tres cuotas de ₡3 400 221,xx: 15/02, 15/03 y 15/04 de 2026.
const conape = (overrides: Partial<DebtProps> = {}) =>
  unwrap(
    Debt.create({
      id: 'conape',
      name: 'CONAPE',
      counterparty: 'CONAPE',
      principal: Money.fromMinorUnits(10_000_000n, 'CRC'),
      rate: unwrap(InterestRate.create(12, 'MONTHLY')),
      termMonths: 3,
      startDate: utc('2026-01-15'),
      kind: 'FRENCH',
      direction: 'BORROWED',
      budgetBucket: 'deudas',
      ...overrides,
    }),
  )

const armar = (inicial: Debt) => {
  let guardada = inicial
  const movimientos: CreateMovementInput[] = []
  const anulados: string[] = []
  const rastro: EntradaDeRastro[] = []

  const debts: DebtRepository = {
    findAll: vi.fn(),
    findById: vi.fn(async () => guardada),
    save: vi.fn(async (debt: Debt) => {
      guardada = debt
    }),
    delete: vi.fn(),
  }
  const crearMovimiento = {
    execute: vi.fn(async (input: CreateMovementInput) => {
      movimientos.push(input)
      return { movement: { id: `mov-${movimientos.length}` }, journalEntryId: 'asiento' }
    }),
  } as unknown as CreateMovementUseCase
  const anularMovimiento = {
    execute: vi.fn(async (id: string) => {
      anulados.push(id)
    }),
  } as unknown as VoidMovementUseCase
  const transaction: UnitOfWork = { withTransaction: (run) => run() }
  const registro: Rastro = { registrar: vi.fn(async (entrada: EntradaDeRastro) => void rastro.push(entrada)) }

  const pagos = new PagosDeDeudaUseCase(debts, crearMovimiento, anularMovimiento, transaction, registro)
  return { pagos, movimientos, anulados, rastro, guardada: () => guardada }
}

describe('pagar una cuota', () => {
  it('crea el gasto por el monto de la cuota y marca la cuota pagada con ese movimiento', async () => {
    const { pagos, movimientos, guardada } = armar(conape())

    await pagos.pagar('conape', { date: '2026-02-15', paymentAccountCode: '1111', categoryId: 'prestamos' })

    expect(movimientos).toEqual([
      {
        date: '2026-02-15',
        kind: 'EXPENSE',
        categoryId: 'prestamos',
        counterparty: 'CONAPE',
        amount: { minorUnits: '3400221', currency: 'CRC' },
        paymentAccountCode: '1111',
      },
    ])
    expect(guardada().payments).toEqual([
      { installmentNumber: 1, date: utc('2026-02-15'), movementId: 'mov-1' },
    ])
  })

  it('deja rastro de que se pagó, no de que se editó', async () => {
    const { pagos, rastro } = armar(conape())

    await pagos.pagar('conape', { date: '2026-02-15', paymentAccountCode: '1111', categoryId: 'prestamos' })

    expect(rastro[0]).toMatchObject({ entidad: 'deuda', entidadId: 'conape', accion: 'pagar' })
  })

  it('no crea el gasto si la cuota no se puede pagar', async () => {
    const { pagos, movimientos } = armar(conape({ termMonths: 1 }))
    await pagos.marcarPagada('conape', { date: '2026-02-15' })

    await expect(
      pagos.pagar('conape', { date: '2026-03-15', paymentAccountCode: '1111', categoryId: 'prestamos' }),
    ).rejects.toBeInstanceOf(SemanticValidationError)
    expect(movimientos).toEqual([])
  })

  it('lo que te deben no se paga desde acá', async () => {
    const { pagos } = armar(conape({ direction: 'LENT', budgetBucket: null }))

    await expect(pagos.marcarPagada('conape', { date: '2026-02-15' })).rejects.toBeInstanceOf(
      SemanticValidationError,
    )
  })
})

describe('marcar una cuota pagada sin movimiento', () => {
  it('salda la cuota sin tocar la contabilidad', async () => {
    const { pagos, movimientos, guardada } = armar(conape())

    await pagos.marcarPagada('conape', { date: '2026-02-15' })

    expect(movimientos).toEqual([])
    expect(guardada().payments).toEqual([
      { installmentNumber: 1, date: utc('2026-02-15'), movementId: null },
    ])
  })
})

describe('deshacer el último pago', () => {
  it('anula su movimiento y devuelve la cuota', async () => {
    const { pagos, anulados, guardada, rastro } = armar(conape())
    await pagos.pagar('conape', { date: '2026-02-15', paymentAccountCode: '1111', categoryId: 'prestamos' })

    await pagos.deshacerUltimo('conape')

    expect(anulados).toEqual(['mov-1'])
    expect(guardada().payments).toEqual([])
    expect(rastro.at(-1)).toMatchObject({ entidad: 'deuda', accion: 'anular' })
  })

  it('un pago sin movimiento se deshace sin anular nada', async () => {
    const { pagos, anulados, guardada } = armar(conape())
    await pagos.marcarPagada('conape', { date: '2026-02-15' })

    await pagos.deshacerUltimo('conape')

    expect(anulados).toEqual([])
    expect(guardada().payments).toEqual([])
  })
})
