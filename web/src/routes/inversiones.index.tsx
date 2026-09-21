import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { FormDialog } from '@/components/form-dialog'
import { ErrorState } from '@/components/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Hint } from '@/components/hint'
import { Amount } from '@/features/accounting/amount'
import { usePrimaryAction } from '@/features/shortcuts/primary-action'
import { copy } from '@/features/investments/copy'
import type { Investment } from '@/features/investments/types'
import {
  useAddCapital,
  useDeleteInvestment,
  useInvestments,
  useSaveInvestment,
} from '@/features/investments/use-investments'
import { formatIsoDate, today } from '@/lib/dates'
import { parseMoneyInput, type CurrencyCode } from '@/lib/money'
import { cn } from '@/lib/utils'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

const monthsUntil = (iso: string): number => {
  const [year, month] = iso.split('-').map(Number)
  if (!year || !month) return 0
  const now = new Date()
  return (year - now.getUTCFullYear()) * 12 + (month - (now.getUTCMonth() + 1))
}

interface FormProps {
  investment?: Investment
  pending: boolean
  onSubmit: (values: {
    name: string
    principal: { minorUnits: string; currency: CurrencyCode }
    annualRate: string
    compounding: 'MONTHLY' | 'ANNUAL'
    openedAt: string
    kind: 'FIXED_TERM' | 'OPEN'
    maturesAt: string | null
    accountCode: string | null
  }) => void
  onCancel: () => void
}

const InvestmentForm = ({ investment, pending, onSubmit, onCancel }: FormProps) => {
  const [name, setName] = useState(investment?.name ?? '')
  const [amount, setAmount] = useState(
    investment ? investment.principal.minorUnits.slice(0, -2) : '',
  )
  const [currency, setCurrency] = useState<CurrencyCode>(
    (investment?.principal.currency as CurrencyCode) ?? 'CRC',
  )
  const [annualRate, setAnnualRate] = useState(investment?.annualRate ?? '0')
  const [compounding, setCompounding] = useState<'MONTHLY' | 'ANNUAL'>(
    investment?.compounding ?? 'MONTHLY',
  )
  const [openedAt, setOpenedAt] = useState(investment?.openedAt ?? today())
  const [kind, setKind] = useState<'FIXED_TERM' | 'OPEN'>(investment?.kind ?? 'FIXED_TERM')
  const [maturesAt, setMaturesAt] = useState(investment?.maturesAt ?? '')

  const fields = copy.investments.form

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      name,
      principal: parseMoneyInput(amount, currency),
      annualRate,
      compounding,
      openedAt,
      kind,
      maturesAt: kind === 'FIXED_TERM' ? maturesAt : null,
      accountCode: investment?.accountCode ?? null,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="inv-name">{fields.name.label}</Label>
          <Input
            id="inv-name"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inv-principal">{fields.principal.label}</Label>
          <div className="flex gap-2">
            <Input
              id="inv-principal"
              value={amount}
              inputMode="decimal"
              required
              className="num num-right"
              onChange={(event) => setAmount(event.target.value)}
            />
            <Select value={currency} onValueChange={(next) => setCurrency(next as CurrencyCode)}>
              <SelectTrigger className="w-24" aria-label="Moneda">
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
          <Label htmlFor="inv-rate">{fields.annualRate.label}</Label>
          <Input
            id="inv-rate"
            value={annualRate}
            inputMode="decimal"
            required
            className="num num-right"
            onChange={(event) => setAnnualRate(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{fields.annualRate.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inv-compounding">{fields.compounding.label}</Label>
          <Select
            value={compounding}
            onValueChange={(next) => setCompounding(next as 'MONTHLY' | 'ANNUAL')}
          >
            <SelectTrigger id="inv-compounding" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">{fields.compounding.monthly}</SelectItem>
              <SelectItem value="ANNUAL">{fields.compounding.annual}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inv-opened">{fields.openedAt.label}</Label>
          <Input
            id="inv-opened"
            type="date"
            value={openedAt}
            required
            onChange={(event) => setOpenedAt(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inv-kind">{fields.kind.label}</Label>
          <Select value={kind} onValueChange={(next) => setKind(next as 'FIXED_TERM' | 'OPEN')}>
            <SelectTrigger id="inv-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED_TERM">{fields.kind.fixedTerm}</SelectItem>
              <SelectItem value="OPEN">{fields.kind.open}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {kind === 'FIXED_TERM' ? (
          <div className="space-y-1.5">
            <Label htmlFor="inv-matures">{fields.maturesAt.label}</Label>
            <Input
              id="inv-matures"
              type="date"
              value={maturesAt}
              required
              onChange={(event) => setMaturesAt(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{fields.maturesAt.hint}</p>
          </div>
        ) : null}
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

interface RowProps {
  investment: Investment
  onEdit: () => void
  onDelete: () => void
  onAddCapital: () => void
}

// Una inversión vencida se distingue de una vigente: su plata ya está disponible, y eso
// cambia qué hacer con ella.
const InvestmentRow = ({ investment, onEdit, onDelete, onAddCapital }: RowProps) => (
  <li className="border-b border-border py-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span className="flex items-baseline gap-2">
        <h2 className={cn('text-sm', investment.matured ? 'font-medium' : '')}>
          <Link
            to="/inversiones/$investmentId"
            params={{ investmentId: investment.id }}
            className="underline-offset-2 hover:underline"
          >
            {investment.name}
          </Link>
        </h2>
        {investment.matured ? (
          <span className="text-xs text-positive">{copy.investments.matured}</span>
        ) : null}
      </span>
      <span className="flex items-baseline gap-4">
        <Amount money={investment.invested} className="w-28 text-xs text-muted-foreground" />
        <Amount money={investment.value} emphasis="strong" className="w-32 text-sm" />
      </span>
    </div>

    <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span>
        {copy.investments.columns.interest} <Amount money={investment.interestEarned} />
      </span>
      <span>
        {copy.investments.columns.rate} <span className="num">{investment.annualRate}%</span>
      </span>
      {investment.maturesAt ? (
        investment.matured ? (
          <Hint text={copy.investments.maturedHint}>
            <span>
              {copy.investments.columns.matures} {formatIsoDate(investment.maturesAt)}
            </span>
          </Hint>
        ) : (
          <span>{copy.investments.monthsLeft(Math.max(monthsUntil(investment.maturesAt), 1))}</span>
        )
      ) : (
        <Hint text={copy.investments.openHint}>
          <span>{copy.investments.kinds.OPEN}</span>
        </Hint>
      )}

      <span className="ml-auto flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onAddCapital}
        >
          {copy.investments.contribute}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={copy.investments.edit(investment.name)}
          onClick={onEdit}
        >
          {copy.investments.form.editTitle}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={copy.investments.delete(investment.name)}
          onClick={onDelete}
        >
          {copy.investments.confirmDelete.confirm}
        </Button>
      </span>
    </div>
  </li>
)

const InvestmentsScreen = () => {
  const [editing, setEditing] = useState<{ investment?: Investment } | null>(null)
  const [deleting, setDeleting] = useState<Investment | null>(null)
  const [adding, setAdding] = useState<Investment | null>(null)
  const [capitalAmount, setCapitalAmount] = useState('')
  const [capitalDate, setCapitalDate] = useState(today())

  const investments = useInvestments()
  usePrimaryAction(copy.investments.new, () => setEditing({}))
  const save = useSaveInvestment()
  const addCapital = useAddCapital()
  const remove = useDeleteInvestment()

  const submitCapital = (event: FormEvent) => {
    event.preventDefault()
    if (!adding) return
    addCapital.mutate(
      {
        id: adding.id,
        input: {
          date: capitalDate,
          amount: parseMoneyInput(capitalAmount, adding.principal.currency as CurrencyCode),
        },
      },
      {
        onSuccess: () => {
          setAdding(null)
          setCapitalAmount('')
        },
      },
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.investments.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.investments.description}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          {copy.investments.new}
        </Button>
      </header>

      {editing ? (
        <div className="border-y border-border py-5">
          <h2 className="mb-4 text-base font-medium tracking-tight">
            {editing.investment
              ? copy.investments.form.editTitle
              : copy.investments.form.createTitle}
          </h2>
          <InvestmentForm
            investment={editing.investment}
            pending={save.isPending}
            onSubmit={(values) =>
              save.mutate(
                { id: editing.investment?.id, input: values },
                { onSuccess: () => setEditing(null) },
              )
            }
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <FormDialog
        open={adding !== null}
        title={copy.investments.contributionForm.title}
        description={copy.investments.contributionForm.date.hint}
        onOpenChange={(open) => !open && setAdding(null)}
      >
        <form onSubmit={submitCapital} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="capital-date">{copy.investments.contributionForm.date.label}</Label>
            <Input
              id="capital-date"
              type="date"
              value={capitalDate}
              required
              onChange={(event) => setCapitalDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capital-amount">{copy.investments.contributionForm.amount.label}</Label>
            <Input
              id="capital-amount"
              value={capitalAmount}
              inputMode="decimal"
              required
              className="num num-right"
              onChange={(event) => setCapitalAmount(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" size="sm" disabled={addCapital.isPending}>
              {copy.investments.contributionForm.submit}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(null)}>
              {copy.common.cancel}
            </Button>
          </div>
        </form>
      </FormDialog>

      {investments.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : investments.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void investments.refetch()}
        />
      ) : investments.data.length === 0 ? (
        <EmptyState
          title={copy.investments.empty.title}
          description={copy.investments.empty.description}
          action={
            <Button size="sm" onClick={() => setEditing({})}>
              {copy.investments.empty.action}
            </Button>
          }
        />
      ) : (
        <ul>
          {investments.data.map((investment) => (
            <InvestmentRow
              key={investment.id}
              investment={investment}
              onEdit={() => setEditing({ investment })}
              onDelete={() => setDeleting(investment)}
              onAddCapital={() => setAdding(investment)}
            />
          ))}
        </ul>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.investments.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.investments.confirmDelete.description(deleting?.name ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate(deleting.id)
                setDeleting(null)
              }}
            >
              {copy.investments.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export const Route = createFileRoute('/inversiones/')({ component: InvestmentsScreen })
