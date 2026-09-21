import { Decimal } from 'decimal.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { unwrap } from '../../../../shared/kernel/result.js'
import { CHART_SEED } from '../../infrastructure/chart-seed.js'
import { Account } from '../account.js'
import { ChartOfAccounts } from '../chart-of-accounts.js'
import type { AccountMovementTotals, DailyAccountTotals } from '../journal-repository.port.js'
import { buildNetWorth, type CurrencyInput } from './net-worth.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

let chart: ChartOfAccounts

beforeAll(() => {
  chart = unwrap(ChartOfAccounts.create(CHART_SEED.map((props) => unwrap(Account.create(props)))))
})

const total = (accountCode: string, debits: bigint, credits: bigint): AccountMovementTotals => ({
  accountCode,
  debits,
  credits,
})

const daily = (
  accountCode: string,
  date: string,
  debits: bigint,
  credits: bigint,
): DailyAccountTotals => ({ accountCode, date: utc(date), debits, credits })

const colones = (
  closing: AccountMovementTotals[],
  dailyTotals: DailyAccountTotals[],
): CurrencyInput => ({
  currency: 'CRC',
  closing,
  daily: dailyTotals,
  closingRate: new Decimal(1),
  dailyRates: new Map(dailyTotals.map((row) => [row.date.toISOString().slice(0, 10), new Decimal(1)])),
})

describe('buildNetWorth', () => {
  it('con una sola moneda el patrimonio es el saldo nativo y el diferencial es cero', () => {
    // Un aporte de ₡1 000 000 a caja: activo 1 000 000, patrimonio 1 000 000.
    const closing = [total('1101', 1_000_000_00n, 0n), total('3110', 0n, 1_000_000_00n)]
    const movements = [
      daily('1101', '2026-09-01', 1_000_000_00n, 0n),
      daily('3110', '2026-09-01', 0n, 1_000_000_00n),
    ]

    const report = unwrap(
      buildNetWorth({
        at: utc('2026-09-30'),
        presentationCurrency: 'CRC',
        chart,
        currencies: [colones(closing, movements)],
      }),
    )

    expect(report.netWorth.minorUnits).toBe(1_000_000_00n)
    expect(report.exchangeDifference.minorUnits).toBe(0n)
    expect(report.balances).toBe(true)
  })

  it('una conversión no crea ni destruye patrimonio, aunque la tasa cambie después', () => {
    // Un aporte de ₡508 000 y, el mismo día, su conversión completa a $1 000 a 508.
    const enColones = colones(
      [total('1101', 508_000_00n, 508_000_00n), total('1190', 508_000_00n, 0n), total('3110', 0n, 508_000_00n)],
      [
        daily('1101', '2026-09-18', 508_000_00n, 508_000_00n),
        daily('1190', '2026-09-18', 508_000_00n, 0n),
        daily('3110', '2026-09-18', 0n, 508_000_00n),
      ],
    )

    const enDolares: CurrencyInput = {
      currency: 'USD',
      closing: [total('1102', 1_000_00n, 0n), total('1190', 0n, 1_000_00n)],
      daily: [
        daily('1102', '2026-09-18', 1_000_00n, 0n),
        daily('1190', '2026-09-18', 0n, 1_000_00n),
      ],
      closingRate: new Decimal('508'),
      dailyRates: new Map([['2026-09-18', new Decimal('508')]]),
    }

    const report = unwrap(
      buildNetWorth({
        at: utc('2026-09-18'),
        presentationCurrency: 'CRC',
        chart,
        currencies: [enColones, enDolares],
      }),
    )

    // Los dólares valen hoy lo mismo que costaron: el patrimonio es el aporte, intacto.
    expect(report.netWorth.minorUnits).toBe(508_000_00n)
    expect(report.exchangeDifference.minorUnits).toBe(0n)
    expect(report.balances).toBe(true)

    // El desglose muestra los dólares que se tienen, no el cero que deja el puente.
    const dolares = report.byCurrency.find((row) => row.currency === 'USD')
    expect(dolares?.netWorthNative.minorUnits).toBe(1_000_00n)
  })

  it('la conversión ya hecha se valúa a la tasa de su día; la tenencia, a la de hoy', () => {
    // El mismo caso, pero el reporte se pide cuando el dólar bajó de 508 a 443,27.
    const enColones = colones(
      [total('1101', 508_000_00n, 508_000_00n), total('1190', 508_000_00n, 0n), total('3110', 0n, 508_000_00n)],
      [
        daily('1101', '2026-09-18', 508_000_00n, 508_000_00n),
        daily('1190', '2026-09-18', 508_000_00n, 0n),
        daily('3110', '2026-09-18', 0n, 508_000_00n),
      ],
    )

    const enDolares: CurrencyInput = {
      currency: 'USD',
      closing: [total('1102', 1_000_00n, 0n), total('1190', 0n, 1_000_00n)],
      daily: [
        daily('1102', '2026-09-18', 1_000_00n, 0n),
        daily('1190', '2026-09-18', 0n, 1_000_00n),
      ],
      closingRate: new Decimal('443.27'),
      dailyRates: new Map([['2026-09-18', new Decimal('508')]]),
    }

    const report = unwrap(
      buildNetWorth({
        at: utc('2026-09-30'),
        presentationCurrency: 'CRC',
        chart,
        currencies: [enColones, enDolares],
      }),
    )

    // Los $1 000 valen hoy ₡443 270. El puente sigue valuado a 508, así que se cancela con
    // los ₡508 000 que salieron de caja y no inventa una ganancia sobre una conversión cerrada.
    expect(report.netWorth.minorUnits).toBe(443_270_00n)
    // 1 000 × (443,27 − 508) = −64 730
    expect(report.exchangeDifference.minorUnits).toBe(-64_730_00n)
    // Los libros dicen ₡508 000 de patrimonio; la diferencia es lo que hizo el tipo de cambio.
    expect(report.equity.minorUnits).toBe(508_000_00n)
    expect(report.balances).toBe(true)
  })

  it('los colones no aportan diferencial ni cuando hay movimientos en muchos días', () => {
    const movements = [
      daily('1101', '2026-09-01', 1_000_000_00n, 0n),
      daily('3110', '2026-09-01', 0n, 1_000_000_00n),
      daily('1101', '2026-09-15', 0n, 250_000_00n),
      daily('6100', '2026-09-15', 250_000_00n, 0n),
    ]
    const closing = [
      total('1101', 1_000_000_00n, 250_000_00n),
      total('3110', 0n, 1_000_000_00n),
      total('6100', 250_000_00n, 0n),
    ]

    const report = unwrap(
      buildNetWorth({
        at: utc('2026-09-30'),
        presentationCurrency: 'CRC',
        chart,
        currencies: [colones(closing, movements)],
      }),
    )

    expect(report.netWorth.minorUnits).toBe(750_000_00n)
    expect(report.exchangeDifference.minorUnits).toBe(0n)
    expect(report.balances).toBe(true)
  })

  it('sin tasa de cierre no hay reporte, y el error nombra la fecha', () => {
    const result = buildNetWorth({
      at: utc('2026-09-30'),
      presentationCurrency: 'CRC',
      chart,
      currencies: [
        { currency: 'USD', closing: [], daily: [], closingRate: null, dailyRates: new Map() },
      ],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('2026-09-30')
      expect(result.error.message).toContain('USD')
    }
  })

  it('sin tasa de un día con movimiento no hay reporte, y el error nombra ese día', () => {
    const result = buildNetWorth({
      at: utc('2026-09-30'),
      presentationCurrency: 'CRC',
      chart,
      currencies: [
        {
          currency: 'USD',
          closing: [total('1102', 1_000_00n, 0n)],
          daily: [daily('1102', '2026-03-05', 1_000_00n, 0n)],
          closingRate: new Decimal('443.27'),
          dailyRates: new Map(),
        },
      ],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('2026-03-05')
  })
})
