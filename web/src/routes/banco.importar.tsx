import { useState, type ChangeEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/banking/copy'
import type { ImportResult, ParsedBankLine } from '@/features/banking/types'
import {
  useBankAccounts,
  useImportProfiles,
  useImportStatement,
  usePreviewStatement,
} from '@/features/banking/use-banking'
import { formatIsoDate } from '@/lib/dates'

const PREVIEW_ROWS = 10

const ImportScreen = () => {
  const [bankAccountId, setBankAccountId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lines, setLines] = useState<ParsedBankLine[] | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const accounts = useBankAccounts()
  const profiles = useImportProfiles()
  const preview = usePreviewStatement()
  const importStatement = useImportStatement()

  const chooseAccount = (id: string) => {
    setBankAccountId(id)
    setLines(null)
    setResult(null)
    // El perfil por omisión de la cuenta: casi siempre es el que corresponde.
    const account = (accounts.data ?? []).find((candidate) => candidate.id === id)
    if (account?.profileId) setProfileId(account.profileId)
  }

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setLines(null)
    setResult(null)
  }

  const ready = bankAccountId !== '' && profileId !== '' && file !== null

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.import.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.import.description}</p>
      </header>

      {accounts.isPending || profiles.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      ) : accounts.isError || profiles.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => {
            if (accounts.isError) void accounts.refetch()
            if (profiles.isError) void profiles.refetch()
          }}
        />
      ) : accounts.data.length === 0 ? (
        <EmptyState
          title={copy.import.needsAccount.title}
          description={copy.import.needsAccount.description}
          action={
            <Button size="sm" asChild>
              <Link to="/banco/cuentas">{copy.import.needsAccount.action}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 border-y border-border py-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="account">{copy.import.account.label}</Label>
              <Select value={bankAccountId} onValueChange={chooseAccount}>
                <SelectTrigger id="account" className="w-full">
                  <SelectValue placeholder={copy.import.account.label} />
                </SelectTrigger>
                <SelectContent>
                  {(accounts.data ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile">{copy.import.profile.label}</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger id="profile" className="w-full">
                  <SelectValue placeholder={copy.import.profile.label} />
                </SelectTrigger>
                <SelectContent>
                  {(profiles.data ?? []).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file">{copy.import.file.label}</Label>
              <Input id="file" type="file" accept=".csv,text/csv" onChange={chooseFile} />
              <p className="text-xs text-muted-foreground">{copy.import.file.hint}</p>
            </div>
          </div>

          <Button
            size="sm"
            disabled={!ready || preview.isPending}
            onClick={() => {
              if (!file) return
              preview.mutate(
                { file, bankAccountId, profileId },
                { onSuccess: (data) => setLines(data.lines) },
              )
            }}
          >
            {copy.import.preview}
          </Button>

          {/* El botón de importar aparece recién después de la vista previa: un perfil mal
              mapeado mete cien líneas torcidas, y revisarlo cuesta menos que deshacerlo. */}
          {lines && lines.length === 0 ? (
            <p className="max-w-[65ch] text-sm text-warning">{copy.import.emptyPreview}</p>
          ) : null}

          {lines && lines.length > 0 ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-medium tracking-tight">{copy.import.previewTitle}</h2>
                <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">
                  {copy.import.previewHint}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.import.previewCount(Math.min(PREVIEW_ROWS, lines.length), lines.length)}
                </p>
              </div>

              <div>
                <div className="hidden grid-cols-[6rem_1fr_8rem_8rem] gap-2 border-b border-border pb-1 text-xs text-muted-foreground sm:grid">
                  <span>{copy.import.columns.date}</span>
                  <span>{copy.import.columns.description}</span>
                  <span>{copy.import.columns.reference}</span>
                  <span className="text-right">{copy.import.columns.amount}</span>
                </div>

                <ul>
                  {lines.slice(0, PREVIEW_ROWS).map((line, index) => (
                    <li
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      className="grid gap-x-2 gap-y-1 border-b border-border py-2 text-sm sm:grid-cols-[6rem_1fr_8rem_8rem] sm:items-baseline"
                    >
                      <span className="num text-xs text-muted-foreground">
                        {formatIsoDate(line.date)}
                      </span>
                      <span className="min-w-0 truncate">{line.description}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {line.reference ?? ''}
                      </span>
                      <Amount money={line.amount} />
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                size="sm"
                disabled={importStatement.isPending}
                onClick={() => {
                  if (!file) return
                  importStatement.mutate(
                    { file, bankAccountId, profileId },
                    {
                      onSuccess: (data) => {
                        setResult(data)
                        setLines(null)
                      },
                    },
                  )
                }}
              >
                {copy.import.submit}
              </Button>
            </div>
          ) : null}

          {result ? (
            <div className="border-y border-border py-5">
              <h2 className="text-base font-medium tracking-tight">{copy.import.result.title}</h2>
              <p className="mt-1 text-sm">
                {copy.import.result.imported(result.imported)}
                {result.duplicated > 0 ? ` · ${copy.import.result.duplicated(result.duplicated)}` : ''}
              </p>
              {result.imported === 0 && result.duplicated > 0 ? (
                <p className="mt-1 max-w-[65ch] text-xs text-muted-foreground">
                  {copy.import.result.allDuplicated}
                </p>
              ) : null}

              <Button variant="secondary" size="sm" className="mt-3" asChild>
                <Link to="/banco/conciliacion">{copy.import.result.goToReconciliation}</Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export const Route = createFileRoute('/banco/importar')({ component: ImportScreen })
