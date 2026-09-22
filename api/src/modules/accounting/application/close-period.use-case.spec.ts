import { describe, expect, it, vi } from 'vitest'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { AccountingPeriod, PeriodKey } from '../domain/accounting-period.js'
import type { AccountRepository } from '../domain/account-repository.port.js'
import type { JournalRepository } from '../domain/journal-repository.port.js'
import type { MovementRepository } from '../domain/movement-repository.port.js'
import type { PeriodRepository } from '../domain/period-repository.port.js'
import { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import { Account } from '../domain/account.js'
import { ClosePeriodUseCase } from './close-period.use-case.js'
import { ListPeriodsUseCase } from './list-periods.use-case.js'
import { PeriodSnapshots } from './period-snapshots.js'
import { ReopenPeriodUseCase } from './reopen-period.use-case.js'

const septiembre = unwrap(PeriodKey.of(2026, 9))
const agosto = unwrap(PeriodKey.of(2026, 8))

const chart = unwrap(
  ChartOfAccounts.create([
    unwrap(
      Account.create({
        code: '1101',
        name: 'Caja colones',
        accountClass: 'ASSET',
        parentCode: null,
        active: true,
        sortOrder: 0,
      }),
    ),
  ]),
)

const accountsStub = (): AccountRepository => ({
  loadChart: vi.fn().mockResolvedValue(chart),
  findByCode: vi.fn(),
  save: vi.fn(),
  saveMany: vi.fn(),
})

interface JournalStubOptions {
  readonly entryCount?: number
  readonly balanced?: boolean
  readonly months?: PeriodKey[]
  readonly historyBefore?: boolean
}

const journalStub = ({
  entryCount = 2,
  balanced = true,
  months = [septiembre],
  historyBefore = true,
}: JournalStubOptions = {}): JournalRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByMovementId: vi.fn(),
  hasEntriesFor: vi.fn().mockResolvedValue(false),
  findInRange: vi.fn().mockResolvedValue({ items: [], totalItems: entryCount }),
  totalsByAccountPerDay: vi.fn().mockResolvedValue([]),
  totalsByAccount: vi
    .fn()
    .mockResolvedValue(
      balanced
        ? [{ accountCode: '1101', debits: 100n, credits: 100n }]
        : [{ accountCode: '1101', debits: 100n, credits: 0n }],
    ),
  totalsUpTo: vi
    .fn()
    .mockResolvedValue(historyBefore ? [{ accountCode: '1101', debits: 1n, credits: 1n }] : []),
  ledgerFor: vi.fn(),
  monthsWithEntries: vi.fn().mockResolvedValue(months),
  openingBalanceFor: vi.fn(),
})

const movementsStub = (unposted = 0, months: PeriodKey[] = []): MovementRepository => ({
  findAll: vi.fn(),
  totalsByCategory: vi.fn().mockResolvedValue([]),
  findById: vi.fn(),
  findByPaymentAccount: vi.fn().mockResolvedValue([]),
  save: vi.fn(),
  countUnposted: vi.fn().mockResolvedValue(unposted),
  monthsWithMovements: vi.fn().mockResolvedValue(months),
})

const periodsStub = (stored: AccountingPeriod[] = []): PeriodRepository => ({
  find: vi
    .fn()
    .mockImplementation(
      async (key: PeriodKey) => stored.find((period) => period.key.compareTo(key) === 0) ?? null,
    ),
  findAll: vi.fn().mockResolvedValue(stored),
  findClosedAfter: vi
    .fn()
    .mockImplementation(async (key: PeriodKey) =>
      stored.filter((period) => period.isClosed() && period.key.compareTo(key) > 0),
    ),
  save: vi.fn(),
  saveMany: vi.fn(),
})

// La transacción del test corre el trabajo tal cual: lo que se prueba acá es la regla del
// cierre, no que Prisma abra una transacción.
const sinTransaccion = { withTransaction: <T>(run: () => Promise<T>) => run() }
const rastroStub = () => ({ registrar: vi.fn() })

const snapshotsWith = (
  journal: JournalRepository,
  movements: MovementRepository,
  periods: PeriodRepository,
) => new PeriodSnapshots(accountsStub(), journal, movements, periods)

describe('ClosePeriodUseCase', () => {
  it('cierra el mes cuando no hay bloqueos', async () => {
    const periods = periodsStub([AccountingPeriod.restore(agosto, 'CLOSED', new Date())])
    const useCase = new ClosePeriodUseCase(
      periods,
      snapshotsWith(journalStub(), movementsStub(), periods),
      sinTransaccion,
      rastroStub(),
    )

    const closed = await useCase.execute(septiembre, new Date('2026-10-01T00:00:00.000Z'))

    expect(closed.isClosed()).toBe(true)
    expect(periods.save).toHaveBeenCalledWith(closed)
  })

  it('acumula todos los bloqueos en los detalles del error', async () => {
    const periods = periodsStub()
    const useCase = new ClosePeriodUseCase(
      periods,
      snapshotsWith(journalStub({ balanced: false }), movementsStub(3), periods),
      sinTransaccion,
      rastroStub(),
    )

    await expect(useCase.execute(septiembre)).rejects.toBeInstanceOf(SemanticValidationError)
    await expect(useCase.execute(septiembre)).rejects.toMatchObject({
      details: {
        blockers: [
          { code: 'PREVIOUS_PERIOD_OPEN' },
          { code: 'UNPOSTED_MOVEMENTS' },
          { code: 'TRIAL_BALANCE_UNBALANCED' },
        ],
      },
    })
    expect(periods.save).not.toHaveBeenCalled()
  })

  it('el primer mes de la historia se cierra sin exigir el anterior', async () => {
    const periods = periodsStub()
    const useCase = new ClosePeriodUseCase(
      periods,
      snapshotsWith(journalStub({ historyBefore: false }), movementsStub(), periods),
      sinTransaccion,
      rastroStub(),
    )

    const closed = await useCase.execute(septiembre)

    expect(closed.isClosed()).toBe(true)
  })
})

describe('ReopenPeriodUseCase', () => {
  it('reabre el mes y todos los posteriores que estén cerrados, de una vez', async () => {
    const octubre = unwrap(PeriodKey.of(2026, 10))
    const periods = periodsStub([
      AccountingPeriod.restore(septiembre, 'CLOSED', new Date()),
      AccountingPeriod.restore(octubre, 'CLOSED', new Date()),
    ])
    const useCase = new ReopenPeriodUseCase(periods, sinTransaccion, rastroStub())

    const reopened = await useCase.execute(septiembre)

    expect(reopened.map((period) => period.key.toString())).toEqual(['2026-09', '2026-10'])
    expect(reopened.every((period) => !period.isClosed())).toBe(true)
    expect(periods.saveMany).toHaveBeenCalledTimes(1)
  })

  it('reabrir un mes que ya estaba abierto no toca nada', async () => {
    const periods = periodsStub()
    const useCase = new ReopenPeriodUseCase(periods, sinTransaccion, rastroStub())

    expect(await useCase.execute(septiembre)).toEqual([])
    expect(periods.saveMany).not.toHaveBeenCalled()
  })
})

describe('ListPeriodsUseCase', () => {
  it('devuelve un resumen por mes con actividad, con sus bloqueos', async () => {
    const periods = periodsStub([AccountingPeriod.restore(agosto, 'CLOSED', new Date())])
    const journal = journalStub({ months: [septiembre] })
    const movements = movementsStub(2, [agosto])
    const useCase = new ListPeriodsUseCase(
      journal,
      movements,
      snapshotsWith(journal, movements, periods),
    )

    const summaries = await useCase.execute()

    expect(summaries.map((s) => s.snapshot.key.toString())).toEqual(['2026-09', '2026-08'])
    expect(summaries[0]?.blockers.map((b) => b.code)).toEqual(['UNPOSTED_MOVEMENTS'])
    expect(summaries[1]?.blockers.map((b) => b.code)).toContain('ALREADY_CLOSED')
  })

  it('sin actividad en ningún mes, la lista viene vacía', async () => {
    const periods = periodsStub()
    const journal = journalStub({ months: [] })
    const movements = movementsStub()
    const useCase = new ListPeriodsUseCase(
      journal,
      movements,
      snapshotsWith(journal, movements, periods),
    )

    expect(await useCase.execute()).toEqual([])
  })
})
