import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type {
  BankAccount,
  BankAccountInput,
  ImportProfile,
  ImportProfileInput,
  ImportResult,
  ParsedBankLine,
  Reconciliation,
} from './types'

// El único endpoint que no manda JSON: el archivo viaja como multipart, así que fetch arma el
// cuerpo y no se le pone content-type a mano.
const uploadStatement = async <T>(
  path: string,
  file: File,
  bankAccountId: string,
  profileId: string,
): Promise<T> => {
  const body = new FormData()
  body.append('file', file)
  body.append('bankAccountId', bankAccountId)
  body.append('profileId', profileId)

  return apiFetch<T>(path, { method: 'POST', body, headers: {} })
}

export const useBankAccounts = () =>
  useQuery({
    queryKey: queryKeys.banking.accounts(),
    queryFn: () => apiFetch<BankAccount[]>('/bank-accounts'),
  })

export const useSaveBankAccount = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BankAccountInput }) =>
      id
        ? apiFetch<BankAccount>(`/bank-accounts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
          })
        : apiFetch<BankAccount>('/bank-accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_account, { id }) => {
      toast.success(id ? copy.accounts.toast.updated : copy.accounts.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.banking.all })
    },
  })
}

export const useImportProfiles = () =>
  useQuery({
    queryKey: queryKeys.banking.profiles(),
    queryFn: () => apiFetch<ImportProfile[]>('/import-profiles'),
  })

export const useSaveImportProfile = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ImportProfileInput }) =>
      id
        ? apiFetch<ImportProfile>(`/import-profiles/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
          })
        : apiFetch<ImportProfile>('/import-profiles', {
            method: 'POST',
            body: JSON.stringify(input),
          }),
    onSuccess: (_profile, { id }) => {
      toast.success(id ? copy.profiles.toast.updated : copy.profiles.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.banking.all })
    },
  })
}

export const usePreviewStatement = () =>
  useMutation({
    mutationFn: ({
      file,
      bankAccountId,
      profileId,
    }: {
      file: File
      bankAccountId: string
      profileId: string
    }) =>
      uploadStatement<{ lines: ParsedBankLine[] }>(
        '/bank-statements/preview',
        file,
        bankAccountId,
        profileId,
      ),
  })

export const useImportStatement = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      bankAccountId,
      profileId,
    }: {
      file: File
      bankAccountId: string
      profileId: string
    }) => uploadStatement<ImportResult>('/bank-statements', file, bankAccountId, profileId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.banking.all })
    },
  })
}

// Veinte parejas es lo que se puede revisar de una sentada sin perder el hilo.
export const PAGE_SIZE = 20

export const useReconciliation = (
  bankAccountId: string,
  from: string,
  to: string,
  page = 1,
) =>
  useQuery({
    queryKey: queryKeys.banking.reconciliation(bankAccountId, from, to, page),
    queryFn: () =>
      apiFetch<Reconciliation>(
        `/bank-accounts/${bankAccountId}/reconciliation?from=${from}&to=${to}&page=${page}&pageSize=${PAGE_SIZE}`,
      ),
    enabled: bankAccountId !== '',
  })

const invalidateAfterLineChange = (client: ReturnType<typeof useQueryClient>) => {
  void client.invalidateQueries({ queryKey: queryKeys.banking.all })
  // Conciliar no cambia la contabilidad, pero convertir una línea en movimiento sí.
  void client.invalidateQueries({ queryKey: queryKeys.accounting.all })
}

export const useMatchLine = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId, movementId }: { lineId: string; movementId: string }) =>
      apiFetch<void>(`/bank-lines/${lineId}/match`, {
        method: 'POST',
        body: JSON.stringify({ movementId }),
      }),
    onSuccess: () => {
      toast.success(copy.reconciliation.toast.matched)
      invalidateAfterLineChange(client)
    },
  })
}

export const useUnmatchLine = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) =>
      apiFetch<void>(`/bank-lines/${lineId}/unmatch`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(copy.reconciliation.toast.unmatched)
      invalidateAfterLineChange(client)
    },
  })
}

export const useIgnoreLine = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) =>
      apiFetch<void>(`/bank-lines/${lineId}/ignore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(copy.reconciliation.toast.ignored)
      invalidateAfterLineChange(client)
    },
  })
}

export const useLineToMovement = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId, categoryId }: { lineId: string; categoryId: string }) =>
      apiFetch<{ movementId: string }>(`/bank-lines/${lineId}/to-movement`, {
        method: 'POST',
        body: JSON.stringify({ categoryId }),
      }),
    onSuccess: () => {
      toast.success(copy.reconciliation.toast.created)
      invalidateAfterLineChange(client)
    },
  })
}
