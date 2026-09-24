import { loUltimoDe, useAlCargarLoUltimo } from '@/lib/usar-lo-ultimo'
import { queryKeys } from '@/lib/query-keys'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FolderTree, Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { FormDialog } from '@/components/form-dialog'
import { TableFrame } from '@/components/table-frame'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { AccountForm, type AccountFormValues } from '@/features/accounting/account-form'
import { AccountsTree } from '@/features/accounting/accounts-tree'
import { copy } from '@/features/accounting/copy'
import { CurrencyField, ControlBar, DateField } from '@/features/accounting/report-controls'
import { useAccounts, useAccountsTree, useSaveAccount } from '@/features/accounting/use-accounting'
import type { Account, CurrencyCode } from '@/features/accounting/types'
import { today } from '@/lib/dates'
import { TableSkeleton } from '@/components/table-skeleton'

type Editing = { account?: Account } | null

const AccountsScreen = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [at, setAt] = useState(today())
  const [editing, setEditing] = useState<Editing>(null)

  const accounts = useAccounts()
  const tree = useAccountsTree(currency, at)
  const save = useSaveAccount()

  // Rearmar el formulario abierto con la versión que guardó la otra persona.
  useAlCargarLoUltimo((cache) =>
    setEditing((actual) => {
      const nueva = actual?.account && loUltimoDe<Account>(cache, queryKeys.accounting.all, actual.account.code, 'code')
      return nueva ? { account: nueva } : actual
    }),
  )

  const submit = (values: AccountFormValues) => {
    const { code, ...rest } = values
    save.mutate(
      editing?.account
        ? { code: editing.account.code, input: { ...rest, version: editing.account.version } }
        : { input: { code, ...rest } },
      { onSuccess: () => setEditing(null) },
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.accounts.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.accounts.description}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          {copy.accounts.new}
        </Button>
      </header>

      <FormDialog
        icon={FolderTree}
        open={editing !== null}
        className="sm:max-w-2xl"
        title={editing?.account ? copy.accounts.form.editTitle : copy.accounts.form.createTitle}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing ? (
          <AccountForm
            key={editing.account ? `${editing.account.code}-${editing.account.version}` : 'nueva'}
            account={editing.account}
            accounts={accounts.data?.data ?? []}
            pending={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </FormDialog>

      <ControlBar>
        <CurrencyField value={currency} onChange={setCurrency} />
        <DateField id="at" label={copy.common.at} value={at} onChange={setAt} />
      </ControlBar>

      {tree.isPending || accounts.isPending ? (
        <TableSkeleton rows={8} label={copy.common.loading} />
      ) : tree.isError || accounts.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => {
            void tree.refetch()
            void accounts.refetch()
          }}
        />
      ) : tree.data.length === 0 ? (
        <EmptyState
          title={copy.accounts.empty.title}
          description={copy.accounts.empty.description}
        />
      ) : (
        <TableFrame>
          <AccountsTree
            nodes={tree.data}
            accounts={accounts.data.data}
            onEdit={(account) => setEditing({ account })}
          />
        </TableFrame>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/cuentas')({ component: AccountsScreen })
