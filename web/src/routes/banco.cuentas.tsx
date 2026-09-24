import { loUltimoDe, useAlCargarLoUltimo } from '@/lib/usar-lo-ultimo'
import { queryKeys } from '@/lib/query-keys'
import { useState, type FormEvent, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Banknote, FileSpreadsheet, Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { FormDialog } from '@/components/form-dialog'
import { FRAME_ROW, FrameHeader, TableFrame } from '@/components/table-frame'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts } from '@/features/accounting/use-accounting'
import { usePrimaryAction } from '@/features/shortcuts/primary-action'
import { copy } from '@/features/banking/copy'
import type { BankAccount, ImportProfile, ImportProfileInput } from '@/features/banking/types'
import {
  useBankAccounts,
  useImportProfiles,
  useSaveBankAccount,
  useSaveImportProfile,
} from '@/features/banking/use-banking'
import type { CurrencyCode } from '@/lib/money'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/table-skeleton'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']
const NO_PROFILE = 'none'

// Encabezado y filas comparten la plantilla. Bajo el ancho de la fila cada celda recupera
// su etiqueta y la fila se lee como bloque.
//
// `@2xl` y no `sm`: la fila mira el ancho del contenedor, no el de la ventana. Con la barra
// lateral abierta, `sm` se encendía a 640 px de ventana cuando el contenido tenía 384.
//
// Las pistas de texto van en `minmax(0,…)` y las de monto quedan fijas: un nombre largo
// puede ceder y recortarse, un monto no se parte nunca.
const ACCOUNT_COLS =
  '@2xl:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_5rem_minmax(0,10rem)_4.5rem] @2xl:items-baseline'
const PROFILE_COLS =
  '@2xl:grid-cols-[minmax(0,1fr)_7rem_minmax(0,11rem)_7rem_4.5rem] @2xl:items-baseline'

const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="flex items-baseline justify-between gap-3 @2xl:contents">
    <span className="text-xs text-muted-foreground @2xl:hidden">{label}</span>
    {children}
  </span>
)

interface AccountFormProps {
  account?: BankAccount
  profiles: ImportProfile[]
  postable: { code: string; name: string }[]
  pending: boolean
  onSubmit: (values: {
    name: string
    accountCode: string
    currency: CurrencyCode
    profileId: string | null
    active: boolean
  }) => void
  onCancel: () => void
}

const AccountForm = ({
  account,
  profiles,
  postable,
  pending,
  onSubmit,
  onCancel,
}: AccountFormProps) => {
  const [name, setName] = useState(account?.name ?? '')
  const [accountCode, setAccountCode] = useState(account?.accountCode ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>(
    (account?.currency as CurrencyCode) ?? 'CRC',
  )
  const [profileId, setProfileId] = useState(account?.profileId ?? null)
  const [active, setActive] = useState(account?.active ?? true)
  const fields = copy.accounts.form

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ name, accountCode, currency, profileId, active })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ba-name">{fields.name.label}</Label>
          <Input id="ba-name" value={name} required onChange={(e) => setName(e.target.value)} />
          <p className="text-xs text-muted-foreground">{fields.name.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ba-account">{fields.accountCode.label}</Label>
          <Select value={accountCode} onValueChange={setAccountCode}>
            <SelectTrigger id="ba-account" className="w-full">
              <SelectValue placeholder={fields.accountCode.label} />
            </SelectTrigger>
            <SelectContent>
              {postable.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{fields.accountCode.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ba-currency">{fields.currency.label}</Label>
          <Select value={currency} onValueChange={(next) => setCurrency(next as CurrencyCode)}>
            <SelectTrigger id="ba-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ba-profile">{fields.profileId.label}</Label>
          <Select
            value={profileId ?? NO_PROFILE}
            onValueChange={(next) => setProfileId(next === NO_PROFILE ? null : next)}
          >
            <SelectTrigger id="ba-profile" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROFILE}>{copy.accounts.noProfile}</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Label htmlFor="ba-active" className="flex items-center gap-2 text-sm font-normal">
        <Checkbox
          id="ba-active"
          checked={active}
          onCheckedChange={(next) => setActive(next === true)}
        />
        {fields.active.label}
      </Label>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={pending || accountCode === ''}>
          {fields.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}

const emptyProfile: ImportProfileInput = {
  name: '',
  delimiter: ',',
  encoding: 'utf-8',
  headerRows: 1,
  dateColumn: 0,
  dateFormat: 'DD/MM/YYYY',
  descriptionColumn: 1,
  referenceColumn: null,
  amountColumn: 3,
  debitColumn: null,
  creditColumn: null,
  decimalSeparator: '.',
  thousandsSeparator: null,
}

const numberOrNull = (value: string): number | null => (value === '' ? null : Number(value))

const ProfileForm = ({
  profile,
  pending,
  onSubmit,
  onCancel,
}: {
  profile?: ImportProfile
  pending: boolean
  onSubmit: (values: ImportProfileInput) => void
  onCancel: () => void
}) => {
  const [values, setValues] = useState<ImportProfileInput>(profile ? { ...profile } : emptyProfile)
  const fields = copy.profiles.form

  const column = (
    key:
      | 'dateColumn'
      | 'descriptionColumn'
      | 'referenceColumn'
      | 'amountColumn'
      | 'debitColumn'
      | 'creditColumn',
    label: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`profile-${key}`}>{label}</Label>
      <Input
        id={`profile-${key}`}
        type="number"
        min={0}
        className="num num-right"
        value={values[key] ?? ''}
        onChange={(e) =>
          setValues({
            ...values,
            [key]:
              key === 'dateColumn' || key === 'descriptionColumn'
                ? Number(e.target.value)
                : numberOrNull(e.target.value),
          })
        }
      />
    </div>
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(values)
      }}
      className="space-y-5"
    >
      <p className="max-w-[65ch] text-xs text-muted-foreground">{fields.columnsHint}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">{fields.name.label}</Label>
          <Input
            id="profile-name"
            value={values.name}
            required
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-delimiter">{fields.delimiter.label}</Label>
          <Input
            id="profile-delimiter"
            value={values.delimiter}
            maxLength={1}
            required
            onChange={(e) => setValues({ ...values, delimiter: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-encoding">{fields.encoding.label}</Label>
          <Select
            value={values.encoding}
            onValueChange={(next) =>
              setValues({ ...values, encoding: next as ImportProfileInput['encoding'] })
            }
          >
            <SelectTrigger id="profile-encoding" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utf-8">utf-8</SelectItem>
              <SelectItem value="latin1">latin1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-header">{fields.headerRows.label}</Label>
          <Input
            id="profile-header"
            type="number"
            min={0}
            className="num num-right"
            value={values.headerRows}
            onChange={(e) => setValues({ ...values, headerRows: Number(e.target.value) })}
          />
        </div>

        {column('dateColumn', fields.dateColumn.label)}

        <div className="space-y-1.5">
          <Label htmlFor="profile-dateformat">{fields.dateFormat.label}</Label>
          <Select
            value={values.dateFormat}
            onValueChange={(next) =>
              setValues({ ...values, dateFormat: next as ImportProfileInput['dateFormat'] })
            }
          >
            <SelectTrigger id="profile-dateformat" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {column('descriptionColumn', fields.descriptionColumn.label)}
        {column('referenceColumn', fields.referenceColumn.label)}
        {column('amountColumn', fields.amountColumn.label)}
        {column('debitColumn', fields.debitColumn.label)}
        {column('creditColumn', fields.creditColumn.label)}

        <div className="space-y-1.5">
          <Label htmlFor="profile-decimal">{fields.decimalSeparator.label}</Label>
          <Select
            value={values.decimalSeparator}
            onValueChange={(next) =>
              setValues({
                ...values,
                decimalSeparator: next as ImportProfileInput['decimalSeparator'],
              })
            }
          >
            <SelectTrigger id="profile-decimal" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=".">{fields.decimalSeparator.options.dot}</SelectItem>
              <SelectItem value=",">{fields.decimalSeparator.options.comma}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-thousands">{fields.thousandsSeparator.label}</Label>
          <Input
            id="profile-thousands"
            value={values.thousandsSeparator ?? ''}
            maxLength={1}
            onChange={(e) => setValues({ ...values, thousandsSeparator: e.target.value || null })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {fields.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}

const BankAccountsScreen = () => {
  const [editingAccount, setEditingAccount] = useState<{ account?: BankAccount } | null>(null)
  const [editingProfile, setEditingProfile] = useState<{ profile?: ImportProfile } | null>(null)

  usePrimaryAction(copy.accounts.new, () => setEditingAccount({}))

  const bankAccounts = useBankAccounts()
  const profiles = useImportProfiles()
  const accounts = useAccounts()
  const saveAccount = useSaveBankAccount()
  // Rearmar los formularios abiertos con la versión que guardó la otra persona.
  useAlCargarLoUltimo((cache) => {
    setEditingAccount((actual) => {
      const nueva = actual?.account && loUltimoDe<BankAccount>(cache, queryKeys.banking.all, actual.account.id)
      return nueva ? { account: nueva } : actual
    })
    setEditingProfile((actual) => {
      const nuevo = actual?.profile && loUltimoDe<ImportProfile>(cache, queryKeys.banking.all, actual.profile.id)
      return nuevo ? { profile: nuevo } : actual
    })
  })
  const saveProfile = useSaveImportProfile()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const postable = all
    .filter(
      (account) => account.active && !parents.has(account.code) && account.accountClass === 'ASSET',
    )
    .map((account) => ({ code: account.code, name: account.name }))
  const profileName = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.name]))
  const accountName = new Map(postable.map((account) => [account.code, account.name]))

  return (
    <section className="space-y-8">
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[60ch]">
            <h1 className="text-xl font-semibold tracking-tight">{copy.accounts.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{copy.accounts.description}</p>
          </div>
          <Button size="sm" onClick={() => setEditingAccount({})}>
            <Plus className="size-4" aria-hidden="true" />
            {copy.accounts.new}
          </Button>
        </header>

        <FormDialog
          icon={Banknote}
          open={editingAccount !== null}
          className="sm:max-w-2xl"
          title={
            editingAccount?.account ? copy.accounts.form.editTitle : copy.accounts.form.createTitle
          }
          onOpenChange={(open) => !open && setEditingAccount(null)}
        >
          {editingAccount ? (
            <AccountForm
              key={editingAccount.account ? `${editingAccount.account.id}-${editingAccount.account.version}` : 'nueva'}
              account={editingAccount.account}
              profiles={profiles.data ?? []}
              postable={postable}
              pending={saveAccount.isPending}
              onSubmit={(values) =>
                saveAccount.mutate(
                  {
                    id: editingAccount.account?.id,
                    input: editingAccount.account ? { ...values, version: editingAccount.account.version } : values,
                  },
                  { onSuccess: () => setEditingAccount(null) },
                )
              }
              onCancel={() => setEditingAccount(null)}
            />
          ) : null}
        </FormDialog>

        {bankAccounts.isPending ? (
          <TableSkeleton rows={2} label={copy.common.loading} />
        ) : bankAccounts.isError ? (
          <ErrorState
            title={copy.common.error.title}
            description={copy.common.error.description}
            retryLabel={copy.common.retry}
            onRetry={() => void bankAccounts.refetch()}
          />
        ) : bankAccounts.data.length === 0 ? (
          <EmptyState
            title={copy.accounts.empty.title}
            description={copy.accounts.empty.description}
            action={
              <Button size="sm" onClick={() => setEditingAccount({})}>
                {copy.accounts.empty.action}
              </Button>
            }
          />
        ) : (
          <TableFrame>
            <FrameHeader className={cn('hidden gap-x-4 @2xl:grid', ACCOUNT_COLS)}>
              <span>{copy.accounts.columns.name}</span>
              <span>{copy.accounts.columns.account}</span>
              <span>{copy.accounts.columns.currency}</span>
              <span>{copy.accounts.columns.profile}</span>
              <span />
            </FrameHeader>

            <ul className="divide-y divide-border">
              {bankAccounts.data.map((account) => (
                <li
                  key={account.id}
                  className={cn('grid gap-x-4 gap-y-1.5 text-sm', FRAME_ROW, ACCOUNT_COLS)}
                >
                  <span className={cn(!account.active && 'text-muted-foreground')}>
                    {account.name}
                    {!account.active ? ` · ${copy.accounts.inactive}` : ''}
                  </span>

                  <Cell label={copy.accounts.columns.account}>
                    <span className="min-w-0 truncate text-xs @2xl:text-sm">
                      <span className="num text-muted-foreground">{account.accountCode}</span>{' '}
                      {accountName.get(account.accountCode)}
                    </span>
                  </Cell>

                  <Cell label={copy.accounts.columns.currency}>
                    <span className="num text-xs @2xl:text-sm">{account.currency}</span>
                  </Cell>

                  <Cell label={copy.accounts.columns.profile}>
                    <span
                      className={cn(
                        'truncate text-xs @2xl:text-sm',
                        account.profileId ? undefined : 'text-muted-foreground',
                      )}
                    >
                      {account.profileId
                        ? profileName.get(account.profileId)
                        : copy.accounts.noProfile}
                    </span>
                  </Cell>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-2 h-7 justify-self-end px-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={copy.accounts.edit(account.name)}
                    onClick={() => setEditingAccount({ account })}
                  >
                    {copy.common.edit}
                  </Button>
                </li>
              ))}
            </ul>
          </TableFrame>
        )}
      </div>

      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[60ch]">
            <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
              <FileSpreadsheet
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {copy.profiles.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.profiles.description}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditingProfile({})}>
            {copy.profiles.new}
          </Button>
        </header>

        <FormDialog
          icon={FileSpreadsheet}
          open={editingProfile !== null}
          className="sm:max-w-3xl"
          title={
            editingProfile?.profile ? copy.profiles.form.editTitle : copy.profiles.form.createTitle
          }
          onOpenChange={(open) => !open && setEditingProfile(null)}
        >
          {editingProfile ? (
            <ProfileForm
              key={editingProfile.profile ? `${editingProfile.profile.id}-${editingProfile.profile.version}` : 'nuevo'}
              profile={editingProfile.profile}
              pending={saveProfile.isPending}
              onSubmit={(values) =>
                saveProfile.mutate(
                  {
                    id: editingProfile.profile?.id,
                    input: editingProfile.profile ? { ...values, version: editingProfile.profile.version } : values,
                  },
                  { onSuccess: () => setEditingProfile(null) },
                )
              }
              onCancel={() => setEditingProfile(null)}
            />
          ) : null}
        </FormDialog>

        {profiles.data && profiles.data.length > 0 ? (
          <TableFrame>
            <FrameHeader className={cn('hidden gap-x-4 @2xl:grid', PROFILE_COLS)}>
              <span>{copy.profiles.columns.name}</span>
              <span>{copy.profiles.columns.delimiter}</span>
              <span>{copy.profiles.columns.dateFormat}</span>
              <span>{copy.profiles.columns.encoding}</span>
              <span />
            </FrameHeader>

            <ul className="divide-y divide-border">
              {profiles.data.map((profile) => (
                <li
                  key={profile.id}
                  className={cn('grid gap-x-4 gap-y-1.5 text-sm', FRAME_ROW, PROFILE_COLS)}
                >
                  <span>{profile.name}</span>

                  <Cell label={copy.profiles.columns.delimiter}>
                    <span className="num text-xs @2xl:text-sm">«{profile.delimiter}»</span>
                  </Cell>

                  <Cell label={copy.profiles.columns.dateFormat}>
                    <span className="num text-xs @2xl:text-sm">{profile.dateFormat}</span>
                  </Cell>

                  <Cell label={copy.profiles.columns.encoding}>
                    <span className="num text-xs @2xl:text-sm">{profile.encoding}</span>
                  </Cell>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-2 h-7 justify-self-end px-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={copy.profiles.edit(profile.name)}
                    onClick={() => setEditingProfile({ profile })}
                  >
                    {copy.common.edit}
                  </Button>
                </li>
              ))}
            </ul>
          </TableFrame>
        ) : (
          <EmptyState
            title={copy.profiles.empty.title}
            description={copy.profiles.empty.description}
            action={
              <Button variant="secondary" size="sm" onClick={() => setEditingProfile({})}>
                {copy.profiles.empty.action}
              </Button>
            }
          />
        )}
      </div>
    </section>
  )
}

export const Route = createFileRoute('/banco/cuentas')({ component: BankAccountsScreen })
