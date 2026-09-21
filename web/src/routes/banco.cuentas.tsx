import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useAccounts } from '@/features/accounting/use-accounting'
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

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']
const NO_PROFILE = 'none'

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Label className="flex items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-foreground"
        />
        {fields.active.label}
      </Label>

      <div className="flex gap-2">
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
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean
  onSubmit: (values: ImportProfileInput) => void
  onCancel: () => void
}) => {
  const [values, setValues] = useState<ImportProfileInput>(emptyProfile)
  const fields = copy.profiles.form

  const column = (
    key: 'dateColumn' | 'descriptionColumn' | 'referenceColumn' | 'amountColumn' | 'debitColumn' | 'creditColumn',
    label: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`profile-${key}`}>{label}</Label>
      <Input
        id={`profile-${key}`}
        type="number"
        min={0}
        className="num"
        value={values[key] ?? ''}
        onChange={(e) =>
          setValues({
            ...values,
            [key]: key === 'dateColumn' || key === 'descriptionColumn'
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

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
            className="num"
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
              <SelectItem value=".">punto</SelectItem>
              <SelectItem value=",">coma</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-thousands">{fields.thousandsSeparator.label}</Label>
          <Input
            id="profile-thousands"
            value={values.thousandsSeparator ?? ''}
            maxLength={1}
            onChange={(e) =>
              setValues({ ...values, thousandsSeparator: e.target.value || null })
            }
          />
        </div>
      </div>

      <div className="flex gap-2">
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
  const [composingProfile, setComposingProfile] = useState(false)

  const bankAccounts = useBankAccounts()
  const profiles = useImportProfiles()
  const accounts = useAccounts()
  const saveAccount = useSaveBankAccount()
  const saveProfile = useSaveImportProfile()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const postable = all
    .filter((account) => account.active && !parents.has(account.code) && account.accountClass === 'ASSET')
    .map((account) => ({ code: account.code, name: account.name }))
  const profileName = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.name]))

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

        {editingAccount ? (
          <div className="border-y border-border py-5">
            <h2 className="mb-4 text-base font-medium tracking-tight">
              {editingAccount.account ? copy.accounts.form.editTitle : copy.accounts.form.createTitle}
            </h2>
            <AccountForm
              account={editingAccount.account}
              profiles={profiles.data ?? []}
              postable={postable}
              pending={saveAccount.isPending}
              onSubmit={(values) =>
                saveAccount.mutate(
                  { id: editingAccount.account?.id, input: values },
                  { onSuccess: () => setEditingAccount(null) },
                )
              }
              onCancel={() => setEditingAccount(null)}
            />
          </div>
        ) : null}

        {bankAccounts.isPending ? (
          <div className="space-y-2" role="status" aria-label={copy.common.loading}>
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
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
          <ul>
            {bankAccounts.data.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3"
              >
                <span className={cn('text-sm', !account.active && 'text-muted-foreground')}>
                  {account.name}
                  {!account.active ? ` · ${copy.accounts.inactive}` : ''}
                </span>
                <span className="flex items-baseline gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="num text-left">{account.accountCode}</span> · {account.currency}
                  </span>
                  <span>{account.profileId ? profileName.get(account.profileId) : copy.accounts.noProfile}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={copy.accounts.edit(account.name)}
                    onClick={() => setEditingAccount({ account })}
                  >
                    {copy.accounts.form.editTitle}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[60ch]">
            <h2 className="text-base font-medium tracking-tight">{copy.profiles.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.profiles.description}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setComposingProfile(true)}>
            {copy.profiles.new}
          </Button>
        </header>

        {composingProfile ? (
          <div className="border-y border-border py-5">
            <ProfileForm
              pending={saveProfile.isPending}
              onSubmit={(values) =>
                saveProfile.mutate(
                  { input: values },
                  { onSuccess: () => setComposingProfile(false) },
                )
              }
              onCancel={() => setComposingProfile(false)}
            />
          </div>
        ) : null}

        {profiles.data && profiles.data.length > 0 ? (
          <ul>
            {profiles.data.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border py-2.5 text-sm"
              >
                <span>{profile.name}</span>
                <span className="text-xs text-muted-foreground">
                  «{profile.delimiter}» · {profile.dateFormat} · {profile.encoding}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={copy.profiles.empty.title}
            description={copy.profiles.empty.description}
            action={
              <Button variant="secondary" size="sm" onClick={() => setComposingProfile(true)}>
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
