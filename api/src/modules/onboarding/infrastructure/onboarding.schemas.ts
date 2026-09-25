import { z } from 'zod'
import { isoDate } from '../../../shared/http/date.schema.js'
import { nameText } from '../../../shared/http/text.schema.js'
import { CURRENCIES } from '../../../shared/kernel/currency.js'

export const onboardingStatusResponseSchema = z
  .object({
    pending: z.boolean(),
    bookId: z.string(),
    steps: z.record(z.string(), z.unknown()),
  })
  .meta({ id: 'OnboardingStatus', title: 'OnboardingStatus' })

export const banksSchema = z
  .object({ banks: z.array(z.object({ name: nameText, currency: z.enum(CURRENCIES) })).min(1).max(20) })
  .meta({ id: 'OnboardingBanksInput', title: 'OnboardingBanksInput' })

export const bancoCreadoSchema = z
  .object({ name: z.string(), currency: z.enum(CURRENCIES), accountCode: z.string(), bankAccountId: z.string() })
  .meta({ id: 'OnboardingBank', title: 'OnboardingBank' })

export type BanksInput = z.infer<typeof banksSchema>

const montoConSigno = z.string().regex(/^-?\d{1,15}$/, { error: 'El monto debe ser un entero en unidades mínimas' })

export const openingBalancesSchema = z
  .object({
    date: isoDate,
    balances: z
      .array(z.object({ accountCode: z.string().regex(/^\d{3,10}$/), amount: montoConSigno }))
      .max(100)
      .refine((saldos) => new Set(saldos.map((saldo) => saldo.accountCode)).size === saldos.length, {
        error: 'Cada cuenta va una sola vez',
      }),
  })
  .meta({ id: 'OpeningBalancesInput', title: 'OpeningBalancesInput' })

export const openingBalancesResponseSchema = z
  .object({ entries: z.array(z.object({ currency: z.enum(CURRENCIES), journalEntryId: z.string() })) })
  .meta({ id: 'OpeningBalancesResult', title: 'OpeningBalancesResult' })

export type OpeningBalancesInput = z.infer<typeof openingBalancesSchema>
