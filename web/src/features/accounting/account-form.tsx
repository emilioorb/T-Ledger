import { useState, type FormEvent } from 'react'
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
import { copy } from './copy'
import type { Account, AccountClass } from './types'

const CLASSES: AccountClass[] = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
]

export interface AccountFormValues {
  code: string
  name: string
  accountClass: AccountClass
  parentCode: string | null
  active: boolean
  sortOrder: number
}

interface Props {
  account?: Account
  accounts: Account[]
  pending: boolean
  onSubmit: (values: AccountFormValues) => void
  onCancel: () => void
}

const NO_PARENT = 'none'

export const AccountForm = ({ account, accounts, pending, onSubmit, onCancel }: Props) => {
  const [values, setValues] = useState<AccountFormValues>({
    code: account?.code ?? '',
    name: account?.name ?? '',
    accountClass: account?.accountClass ?? 'ASSET',
    parentCode: account?.parentCode ?? null,
    active: account?.active ?? true,
    sortOrder: account?.sortOrder ?? 0,
  })

  const fields = copy.accounts.form
  const isEdit = account !== undefined
  // Solo cuentas de la misma clase pueden ser madre: ofrecer las demás sería ofrecer
  // un error que la API va a rechazar.
  const parents = accounts.filter(
    (candidate) => candidate.accountClass === values.accountClass && candidate.code !== values.code,
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {!isEdit ? (
          <div className="space-y-1.5">
            <Label htmlFor="code">{fields.code.label}</Label>
            <Input
              id="code"
              value={values.code}
              inputMode="numeric"
              required
              onChange={(event) => setValues({ ...values, code: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">{fields.code.hint}</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">{fields.name.label}</Label>
          <Input
            id="name"
            value={values.name}
            required
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accountClass">{fields.accountClass.label}</Label>
          <Select
            value={values.accountClass}
            onValueChange={(next) =>
              setValues({ ...values, accountClass: next as AccountClass, parentCode: null })
            }
          >
            <SelectTrigger id="accountClass" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map((accountClass) => (
                <SelectItem key={accountClass} value={accountClass}>
                  {copy.accounts.classes[accountClass]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{fields.accountClass.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="parentCode">{fields.parentCode.label}</Label>
          <Select
            value={values.parentCode ?? NO_PARENT}
            onValueChange={(next) =>
              setValues({ ...values, parentCode: next === NO_PARENT ? null : next })
            }
          >
            <SelectTrigger id="parentCode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>{fields.noParent}</SelectItem>
              {parents.map((parent) => (
                <SelectItem key={parent.code} value={parent.code}>
                  {parent.code} · {parent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{fields.parentCode.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">{fields.sortOrder.label}</Label>
          <Input
            id="sortOrder"
            type="number"
            value={values.sortOrder}
            onChange={(event) => setValues({ ...values, sortOrder: Number(event.target.value) })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="active" className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={values.active}
              onChange={(event) => setValues({ ...values, active: event.target.checked })}
              className="size-4 accent-foreground"
            />
            {fields.active.label}
          </Label>
          <p className="text-xs text-muted-foreground">{fields.active.hint}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {copy.common.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}
