import type { components } from '@/lib/api-types.gen'

export type Money = components['schemas']['Money']
export type BankAccount = components['schemas']['BankAccount']
export type BankAccountInput = components['schemas']['BankAccountInput']
export type ImportProfile = components['schemas']['ImportProfile']
export type ImportProfileInput = components['schemas']['ImportProfileInput']
export type BankLine = components['schemas']['BankLine']
export type ParsedBankLine = components['schemas']['ParsedBankLine']
export type ImportResult = components['schemas']['ImportResult']
export type Reconciliation = components['schemas']['Reconciliation']
export type MatchSuggestion = components['schemas']['MatchSuggestion']
export type MatchReason = MatchSuggestion['reason']
