import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type {
  Account,
  AccountInput,
  AccountPatch,
  AccountingPeriod,
  Category,
  CategoryInput,
  CategoryPatch,
  CurrencyCode,
  FinancialPosition,
  GeneralLedger,
  IncomeStatement,
  JournalEntry,
  JournalEntryInput,
  Movement,
  MovementFilters,
  MovementInput,
  MovementPatch,
  NetWorth,
  Paginated,
  PeriodSummary,
  ReportNode,
  TrialBalance,
} from './types'

// Ningún hook trae onError: el QueryCache y el MutationCache del router ya ponen el toast.

// El tope de la API. Con un solo usuario, el plan de cuentas entero entra de un tirón.
const ALL = 100

// Una página cabe en una pantalla sin desplazar el encabezado fuera de vista.
export const PAGE_SIZE = 25

const query = (params: Record<string, string | number | undefined>): string =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')

export const useAccounts = () =>
  useQuery({
    queryKey: queryKeys.accounting.accounts(),
    queryFn: () => apiFetch<Paginated<Account>>(`/accounts?${query({ pageSize: ALL })}`),
  })

// La plata solo vive en las hojas del activo: una cuenta con hijas es un total, no un lugar.
// Metas e inversiones preguntan lo mismo —de dónde sale, dónde queda— y preguntan acá.
export const usePostableAssets = () => {
  const accounts = useAccounts()
  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  return all.filter(
    (account) => account.accountClass === 'ASSET' && account.active && !parents.has(account.code),
  )
}

export const useAccountsTree = (currency: CurrencyCode, at: string) =>
  useQuery({
    queryKey: queryKeys.accounting.accountsTree(currency, at),
    queryFn: () => apiFetch<ReportNode[]>(`/accounts/tree?${query({ currency, at })}`),
  })

export const useSaveAccount = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ code, input }: { code?: string; input: AccountInput | AccountPatch }) =>
      code
        ? apiFetch<Account>(`/accounts/${code}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_account, { code }) => {
      toast.success(code ? copy.accounts.toast.updated : copy.accounts.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.accounting.categories(),
    queryFn: () => apiFetch<Category[]>('/categories'),
  })

export const useSaveCategory = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CategoryInput | CategoryPatch }) =>
      id
        ? apiFetch<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_category, { id }) => {
      toast.success(id ? copy.categories.toast.updated : copy.categories.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const useDeleteCategory = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(copy.categories.toast.deleted)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

// La conciliación no lista movimientos: los usa para nombrar sus candidatos, y un candidato
// de la página dos quedaría sin nombre. Por eso el tamaño de página se puede pedir.
export const useMovements = (filters: MovementFilters, page = 1, pageSize = PAGE_SIZE) =>
  useQuery({
    queryKey: queryKeys.accounting.movements({ ...filters, page, pageSize }),
    queryFn: () =>
      apiFetch<Paginated<Movement>>(`/movements?${query({ page, pageSize, ...filters })}`),
  })

export const useSaveMovement = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MovementInput | MovementPatch }) =>
      id
        ? apiFetch<Movement>(`/movements/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Movement>('/movements', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (movement, { id }) => {
      // Un movimiento guardado sin asiento no es un error, pero tiene que decirse:
      // si no, Emilio descubre el faltante recién al cerrar el mes.
      if (id) toast.success(copy.movements.toast.updated)
      else if (movement.posted) toast.success(copy.movements.toast.created)
      else toast.warning(copy.movements.toast.createdUnposted)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const useVoidMovement = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<Movement>(`/movements/${id}/void`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(copy.movements.toast.voided)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const useJournalEntries = (from: string, to: string, page = 1) =>
  useQuery({
    queryKey: queryKeys.accounting.journal(from, to, page),
    queryFn: () =>
      apiFetch<Paginated<JournalEntry>>(
        `/journal-entries?${query({ from, to, page, pageSize: PAGE_SIZE })}`,
      ),
  })

export const useCreateJournalEntry = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: JournalEntryInput) =>
      apiFetch<JournalEntry>('/journal-entries', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success(copy.journal.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const useLedger = (account: string, currency: CurrencyCode, from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.accounting.ledger(account, currency, from, to),
    queryFn: () =>
      apiFetch<GeneralLedger>(`/reports/ledger?${query({ account, currency, from, to })}`),
    enabled: account !== '',
  })

export const useTrialBalance = (currency: CurrencyCode, from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.accounting.trialBalance(currency, from, to),
    queryFn: () =>
      apiFetch<TrialBalance>(`/reports/trial-balance?${query({ currency, from, to })}`),
  })

export const useFinancialPosition = (currency: CurrencyCode, at: string) =>
  useQuery({
    queryKey: queryKeys.accounting.financialPosition(currency, at),
    queryFn: () =>
      apiFetch<FinancialPosition>(`/reports/financial-position?${query({ currency, at })}`),
  })

// El patrimonio consolidado no recibe moneda: consolidar es justamente no elegir una.
export const useNetWorth = (at: string) =>
  useQuery({
    queryKey: queryKeys.accounting.netWorth(at),
    queryFn: () => apiFetch<NetWorth>(`/reports/net-worth?${query({ at })}`),
  })

export const useIncomeStatement = (currency: CurrencyCode, from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.accounting.incomeStatement(currency, from, to),
    queryFn: () =>
      apiFetch<IncomeStatement>(`/reports/income-statement?${query({ currency, from, to })}`),
  })

export const usePeriods = () =>
  useQuery({
    queryKey: queryKeys.accounting.periods(),
    queryFn: () => apiFetch<Paginated<PeriodSummary>>('/periods'),
  })

export const useClosePeriod = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (period: string) =>
      apiFetch<AccountingPeriod>(`/periods/${period}/close`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(copy.closing.toast.closed)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const useReopenPeriod = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (period: string) =>
      apiFetch<{ reopened: AccountingPeriod[] }>(`/periods/${period}/reopen`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(copy.closing.toast.reopened)
      void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

export const trialBalanceCsvUrl = (currency: CurrencyCode, from: string, to: string): string =>
  `/api/v1/reports/trial-balance?${query({ currency, from, to, format: 'csv' })}`
