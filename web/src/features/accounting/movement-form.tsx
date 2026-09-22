import { PaperclipIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { TEXT_LINK } from '@/components/text-link'
import { cn } from '@/lib/utils'
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
  // El comprobante viaja aparte del resto: es un archivo, no un dato del asiento, y se sube
  // después de que el movimiento exista —al crear todavía no hay a qué adjuntarlo—.
  comprobante?: File | null
}

// Lo mismo que acepta el servidor. Acá sirve para que el explorador de archivos muestre solo
// lo que va a pasar, no para validar: eso se comprueba donde no se puede saltar.
const ACEPTADOS = 'image/jpeg,image/png,image/webp,image/heic,application/pdf'

// El enlace va directo a la API y no por `apiFetch`: el navegador tiene que seguir la
// redirección al archivo por su cuenta, y en desarrollo el proxy de Vite ya manda `/api` al
// servidor.
const ComprobanteGuardado = ({
  movimiento,
  onQuitar,
}: {
  movimiento: string
  onQuitar?: () => void
}) => (
  <div className="flex items-center gap-2">
    <a
      href={`/api/v1/movements/${movimiento}/receipt`}
      target="_blank"
      rel="noreferrer"
      className={cn('flex items-center gap-1.5 text-sm', TEXT_LINK)}
    >
      <PaperclipIcon className="size-3.5 shrink-0" aria-hidden="true" />
      {copy.movements.form.receiptKey.see}
    </a>

    {onQuitar ? (
      <Button type="button" variant="ghost" size="sm" onClick={onQuitar}>
        {copy.movements.form.receiptKey.remove}
      </Button>
    ) : null}
  </div>
)

interface Props {
  movement?: Movement
  categories: Category[]
  paymentAccounts: Account[]
  pending: boolean
  onSubmit: (values: MovementFormValues) => void
  onCancel: () => void
  onQuitarComprobante?: () => void
}

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

export const MovementForm = ({
  movement,
  categories,
  paymentAccounts,
  pending,
  onSubmit,
  onCancel,
  onQuitarComprobante,
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
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [amountError, setAmountError] = useState(false)

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
        comprobante,
      })
    } catch {
      setAmountError(true)
      toast.error(copy.movements.toast.invalidAmount)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
              className="num num-right"
              aria-invalid={amountError}
              onChange={(event) => {
                setAmountError(false)
                setAmount(event.target.value)
              }}
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
          <Label htmlFor="comprobante">{fields.receiptKey.label}</Label>

          {/* El que ya está y el que se va a subir, en el mismo lugar: quien abre a editar un
              movimiento con factura tiene que verla antes de que se le ofrezca reemplazarla. */}
          {movement?.receiptKey && comprobante === null ? (
            <ComprobanteGuardado movimiento={movement.id} onQuitar={onQuitarComprobante} />
          ) : null}

          {/* Más angosto que la fila: un selector de archivo no tiene nada que alinear a la
              derecha, y estirado hasta el borde deja un vacío entre el nombre del archivo y
              el final de la caja. */}
          <Input
            id="comprobante"
            type="file"
            accept={ACEPTADOS}
            className="h-auto max-w-sm py-1.5 file:mr-3 file:text-xs file:text-muted-foreground"
            onChange={(evento) => setComprobante(evento.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">{fields.receiptKey.hint}</p>
        </div>
      </div>

      {movement ? <p className="text-xs text-muted-foreground">{fields.editNote}</p> : null}

      <div className="flex justify-end gap-2">
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
