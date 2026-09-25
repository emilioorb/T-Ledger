import { z } from 'zod'
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
