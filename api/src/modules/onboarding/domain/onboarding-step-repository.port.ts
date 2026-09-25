export const PASOS_DE_BIENVENIDA = ['banks', 'opening-balances', 'categories', 'income'] as const
export type PasoDeBienvenida = (typeof PASOS_DE_BIENVENIDA)[number]

// El resultado es lo que el paso devolvió la primera vez. Se guarda tal cual para devolverlo
// igual ante un reintento.
export interface OnboardingStepRepository {
  find(step: PasoDeBienvenida): Promise<unknown | null>
  findAll(): Promise<Partial<Record<PasoDeBienvenida, unknown>>>
  save(step: PasoDeBienvenida, result: unknown): Promise<void>
}

export const ONBOARDING_STEP_REPOSITORY = Symbol('ONBOARDING_STEP_REPOSITORY')
