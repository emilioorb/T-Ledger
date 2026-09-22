import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { JournalRepository } from '../../accounting/domain/journal-repository.port.js'
import {
  AccountingSpendingProvider,
  type BucketAccountMapping,
} from './accounting-spending.provider.js'

const septiembre = unwrap(PeriodKey.of(2026, 9))

const mapping: BucketAccountMapping[] = [
  { bucketId: 'necesidades', accountCodes: ['6100', '6110'] },
  { bucketId: 'deseos', accountCodes: ['6200'] },
  { bucketId: 'ahorro', accountCodes: [] },
]

let journal: { totalsByAccount: ReturnType<typeof vi.fn> }
let provider: AccountingSpendingProvider

beforeEach(() => {
  journal = { totalsByAccount: vi.fn().mockResolvedValue([]) }
  provider = new AccountingSpendingProvider(journal as unknown as JournalRepository)
})

describe('AccountingSpendingProvider', () => {
  it('suma los asientos de las cuentas de cada cubeta', async () => {
    journal.totalsByAccount.mockResolvedValue([
      { accountCode: '6100', debits: 30_000_00n, credits: 0n },
      { accountCode: '6110', debits: 20_000_00n, credits: 0n },
      { accountCode: '6200', debits: 15_000_00n, credits: 0n },
    ])

    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('necesidades').minorUnits).toBe(50_000_00n)
    expect(spending.amountFor('deseos').minorUnits).toBe(15_000_00n)
  })

  it('una cubeta sin cuentas mapeadas consume cero, no falla', async () => {
    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('ahorro').minorUnits).toBe(0n)
  })

  it('una cubeta desconocida devuelve cero', async () => {
    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('inventada').minorUnits).toBe(0n)
  })

  it('un reintegro resta del gasto de la cubeta', async () => {
    // Una devolución acredita la cuenta de gasto: el consumo neto del mes baja.
    journal.totalsByAccount.mockResolvedValue([
      { accountCode: '6100', debits: 30_000_00n, credits: 5_000_00n },
    ])

    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('necesidades').minorUnits).toBe(25_000_00n)
  })

  it('pide a la contabilidad solo el rango del período', async () => {
    await provider.spendingFor(septiembre, 'CRC', mapping)

    const [currency, range] = journal.totalsByAccount.mock.calls[0] as [
      string,
      { from: Date; to: Date },
    ]
    expect(currency).toBe('CRC')
    expect(range.from.toISOString().slice(0, 10)).toBe('2026-09-01')
    expect(range.to.toISOString().slice(0, 10)).toBe('2026-09-30')
  })

  it('ignora las cuentas que no pertenecen a ninguna cubeta', async () => {
    journal.totalsByAccount.mockResolvedValue([
      { accountCode: '6100', debits: 30_000_00n, credits: 0n },
      { accountCode: '1101', debits: 0n, credits: 30_000_00n },
    ])

    const spending = await provider.spendingFor(septiembre, 'CRC', mapping)

    expect(spending.amountFor('necesidades').minorUnits).toBe(30_000_00n)
  })
})
