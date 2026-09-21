import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
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
import { parseMoneyInput, toMoneyInput, type CurrencyCode as MoneyCurrency } from '@/lib/money'
import { today } from '@/lib/dates'
import { copy } from './copy'
import type { Account, Category, CategoryKind, CurrencyCode, Money, Movement } from './types'

export interface MovementFormValues {
  date: string
  kind: CategoryKind
  categoryId: string
  counterparty: string
  amount: Money
  paymentAccountCode: string | null
  receiptUrl: string | null
}

interface Props {
  movement?: Movement
  categories: Category[]
  paymentAccounts: Account[]
  pending: boolean
  onSubmit: (values: MovementFormValues) => void
  onCancel: () => void
}

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

export const MovementForm = ({
  movement,
  categories,
  paymentAccounts,
  pending,
  onSubmit,
  onCancel,
}: Props) => {
  const [date, setDate] = useState(movement?.date ?? today())
  const [kind, setKind] = useState<CategoryKind>(movement?.kind ?? 'EXPENSE')
  const [categoryId, setCategoryId] = useState(movement?.categoryId ?? '')
  const [counterparty, setCounterparty] = useState(movement?.counterparty ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>(movement?.amount.currency ?? 'CRC')
  const [amount, setAmount] = useState(movement ? toMoneyInput(movement.amount) : '')
  const [paymentAccountCode, setPaymentAccountCode] = useState(
    movement?.paymentAccountCode ?? paymentAccounts[0]?.code ?? '',
  )
  const [receiptUrl, setReceiptUrl] = useState(movement?.receiptUrl ?? '')

  const fields = copy.movements.form
  const ofKind = categories.filter((category) => category.kind === kind && category.active)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      onSubmit({
        date,
        kind,
        categoryId,
        counterparty,
        amount: parseMoneyInput(amount, currency as MoneyCurrency) as Money,
        paymentAccountCode: paymentAccountCode === '' ? null : paymentAccountCode,
        receiptUrl: receiptUrl.trim() === '' ? null : receiptUrl.trim(),
      })
    } catch {
      toast.error(copy.movements.toast.createdUnposted)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">{fields.date.label}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="kind">{fields.kind.label}</Label>
          <Select
            value={kind}
            onValueChange={(next) => {
              setKind(next as CategoryKind)
              setCategoryId('')
            }}
          >
            <SelectTrigger id="kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">{fields.kind.expense}</SelectItem>
              <SelectItem value="INCOME">{fields.kind.income}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryId">{fields.categoryId.label}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="categoryId" className="w-full">
              <SelectValue placeholder={fields.categoryId.label} />
            </SelectTrigger>
            <SelectContent>
              {ofKind.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                  {category.accountCode === null ? ` · ${copy.categories.unmapped}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counterparty">{fields.counterparty.label}</Label>
          <Input
            id="counterparty"
            value={counterparty}
            required
            onChange={(event) => setCounterparty(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{fields.counterparty.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">{fields.amount.label}</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              value={amount}
              inputMode="decimal"
              required
              className="num"
              onChange={(event) => setAmount(event.target.value)}
            />
            <Select value={currency} onValueChange={(next) => setCurrency(next as CurrencyCode)}>
              <SelectTrigger className="w-24" aria-label={copy.common.currency.label}>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paymentAccountCode">{fields.paymentAccountCode.label}</Label>
          <Select value={paymentAccountCode} onValueChange={setPaymentAccountCode}>
            <SelectTrigger id="paymentAccountCode" className="w-full">
              <SelectValue placeholder={fields.paymentAccountCode.label} />
            </SelectTrigger>
            <SelectContent>
              {paymentAccounts.map((account) => (
                <SelectItem key={account.code} value={account.code}>
                  {account.code} · {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{fields.paymentAccountCode.hint}</p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="receiptUrl">{fields.receiptUrl.label}</Label>
          <Input
            id="receiptUrl"
            value={receiptUrl}
            onChange={(event) => setReceiptUrl(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{fields.receiptUrl.hint}</p>
        </div>
      </div>

      {movement ? <p className="text-xs text-muted-foreground">{fields.editNote}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || categoryId === ''}>
          {copy.common.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}
