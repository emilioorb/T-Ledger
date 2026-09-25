import type { components } from '@/lib/api-types.gen'

export type OnboardingStatus = components['schemas']['OnboardingStatus']
export type BancoCreado = components['schemas']['OnboardingBank']
export type CategoriaCreada = components['schemas']['OnboardingCategory']
export type SaldosCargados = components['schemas']['OpeningBalancesResult']
export type IngresoDeclarado = components['schemas']['OnboardingIncome']
export type Moneda = BancoCreado['currency']
