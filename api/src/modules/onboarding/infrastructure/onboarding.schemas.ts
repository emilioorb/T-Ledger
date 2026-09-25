import { z } from 'zod'

export const onboardingStatusResponseSchema = z
  .object({
    pending: z.boolean(),
    bookId: z.string(),
    steps: z.record(z.string(), z.unknown()),
  })
  .meta({ id: 'OnboardingStatus', title: 'OnboardingStatus' })
