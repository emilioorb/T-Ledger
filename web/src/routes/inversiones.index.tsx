import { loUltimoDe, useAlCargarLoUltimo } from '@/lib/cargar-lo-ultimo'
import { queryKeys } from '@/lib/query-keys'
import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Coins, PiggyBank, Plus } from 'lucide-react'
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
import { Card } from '@/components/ui/card'
import { Amount } from '@/features/accounting/amount'
import { usePostableAssets } from '@/features/accounting/use-accounting'
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
import { formatMoney, parseMoneyInput, type CurrencyCode } from '@/lib/money'
import { ProgressBar } from '@/components/progress-bar'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

// Radix no acepta un item con valor vacío, y «sin cuenta» es una opción real.
const NO_ACCOUNT = '__ninguna__'

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
  const [accountCode, setAccountCode] = useState(investment?.accountCode ?? '')

  const fields = copy.investments.form
  const accounts = usePostableAssets()

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
      accountCode: accountCode === '' ? null : accountCode,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="space-y-1.5">
          <Label htmlFor="inv-account">{fields.accountCode.label}</Label>
          <Select
            value={accountCode === '' ? NO_ACCOUNT : accountCode}
            onValueChange={(next) => setAccountCode(next === NO_ACCOUNT ? '' : next)}
          >
            <SelectTrigger id="inv-account" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ACCOUNT}>{fields.noAccount}</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.code} value={account.code}>
                  {account.code} · {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{fields.accountCode.hint}</p>
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

interface CardProps {
  investment: Investment
  onEdit: () => void
  onDelete: () => void
  onAddCapital: () => void
}

// Lo que se viene a mirar es cuánto vale hoy; el capital y el interés van debajo porque
// explican ese número. La barra es el plazo corrido, no el rendimiento: responde cuándo
// vuelve a estar disponible la plata.
const termProgressOf = (investment: Investment): number | null => {
  if (investment.maturesAt === null) return null
  const opened = Date.parse(investment.openedAt)
  const matures = Date.parse(investment.maturesAt)
  if (matures <= opened) return 1
  return Math.min(Math.max((Date.now() - opened) / (matures - opened), 0), 1)
}

const InvestmentStatus = ({ investment }: { investment: Investment }) => {
  if (investment.matured)
    return (
      <Hint text={copy.investments.maturedHint}>
        <span className="text-positive">{copy.investments.matured}</span>
      </Hint>
    )
  if (investment.maturesAt !== null)
    return (
      <span className="text-muted-foreground">
        {copy.investments.monthsLeft(Math.max(monthsUntil(investment.maturesAt), 1))}
      </span>
    )
  return (
    <Hint text={copy.investments.openHint}>
      <span className="text-muted-foreground">{copy.investments.kinds.OPEN}</span>
    </Hint>
  )
}

interface ActionProps {
  children: string
  label?: string
  onClick: () => void
}

const InvestmentAction = ({ children, label, onClick }: ActionProps) => (
  <Button
    variant="ghost"
    size="sm"
    aria-label={label}
    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
    onClick={onClick}
  >
    {children}
  </Button>
)

const InvestmentCard = ({ investment, onEdit, onDelete, onAddCapital }: CardProps) => {
  const progress = termProgressOf(investment)

  return (
    <Card size="sm" className="gap-0 px-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-medium tracking-tight">
          <Link
            to="/inversiones/$investmentId"
            params={{ investmentId: investment.id }}
            className="underline-offset-2 hover:underline"
          >
            {investment.name}
          </Link>
        </h2>
        <span className="shrink-0 text-xs">
          <InvestmentStatus investment={investment} />
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">{copy.investments.valueToday}</p>
        <p className="num mt-1 text-2xl leading-none tracking-tight">
          {formatMoney(investment.value)}
        </p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground">
          {copy.investments.investedShort}
          <Amount money={investment.invested} />
          <span aria-hidden="true">·</span>
          <span className="text-positive">
            <Amount money={investment.interestEarned} />
          </span>
          {copy.investments.earnedShort}
        </p>
      </div>

      {/* Los extremos de la barra son las dos fechas: empieza donde abrió y termina donde vence. */}
      <div className="mt-5">
        {progress === null || investment.maturesAt === null ? (
          <p className="text-xs text-muted-foreground">{copy.investments.noMaturity}</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
              <span className="num">{formatIsoDate(investment.openedAt)}</span>
              <span className="num">{formatIsoDate(investment.maturesAt)}</span>
            </div>
            <ProgressBar
              className="mt-1.5"
              value={progress}
              tone={investment.matured ? 'positive' : 'plain'}
              label={copy.investments.termLabel(
                formatIsoDate(investment.openedAt),
                formatIsoDate(investment.maturesAt),
              )}
            />
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
          {copy.investments.columns.rate}
          <span className="num">{investment.annualRate}%</span>
        </span>

        <div className="-mr-2 flex shrink-0 gap-0.5">
          <InvestmentAction onClick={onAddCapital}>{copy.investments.contribute}</InvestmentAction>
          <InvestmentAction label={copy.investments.edit(investment.name)} onClick={onEdit}>
            {copy.common.edit}
          </InvestmentAction>
          <InvestmentAction label={copy.investments.delete(investment.name)} onClick={onDelete}>
            {copy.investments.confirmDelete.confirm}
          </InvestmentAction>
        </div>
      </div>
    </Card>
  )
}

const InvestmentsScreen = () => {
  const [editing, setEditing] = useState<{ investment?: Investment } | null>(null)
  const [deleting, setDeleting] = useState<Investment | null>(null)
  const [adding, setAdding] = useState<Investment | null>(null)
  const [capitalAmount, setCapitalAmount] = useState('')
  const [capitalDate, setCapitalDate] = useState(today())
  const [fromAccountCode, setFromAccountCode] = useState('')

  const investments = useInvestments()

  // La cuenta de la inversión no puede ser el origen: el traslado sería de ella a ella misma.
  const origins = usePostableAssets().filter((account) => account.code !== adding?.accountCode)
  usePrimaryAction(copy.investments.new, () => setEditing({}))
  // Rearmar el formulario abierto con la versión que guardó la otra persona.
  useAlCargarLoUltimo((cache) =>
    setEditing((actual) => {
      const nueva = actual?.investment && loUltimoDe<Investment>(cache, queryKeys.investments.all, actual.investment.id)
      return nueva ? { investment: nueva } : actual
    }),
  )
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
          fromAccountCode,
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

      <FormDialog
        icon={PiggyBank}
        open={editing !== null}
        className="sm:max-w-2xl"
        title={
          editing?.investment ? copy.investments.form.editTitle : copy.investments.form.createTitle
        }
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing ? (
          <InvestmentForm
            key={editing.investment ? `${editing.investment.id}-${editing.investment.version}` : 'nueva'}
            investment={editing.investment}
            pending={save.isPending}
            onSubmit={(values) =>
              save.mutate(
                // Al editar, la versión que se vio: si otra persona guardó antes, 409 y el aviso
                // ofrece cargar lo último.
                {
                  id: editing.investment?.id,
                  input: editing.investment ? { ...values, version: editing.investment.version } : values,
                },
                { onSuccess: () => setEditing(null) },
              )
            }
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </FormDialog>

      <FormDialog
        icon={Coins}
        open={adding !== null}
        title={copy.investments.contributionForm.title}
        description={copy.investments.contributionForm.description}
        onOpenChange={(open) => !open && setAdding(null)}
      >
        {adding && adding.accountCode === null ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {copy.investments.contributionForm.needsAccount}
            </p>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  const investment = adding
                  setAdding(null)
                  setEditing({ investment })
                }}
              >
                {copy.investments.contributionForm.editInvestment}
              </Button>
            </div>
          </div>
        ) : (
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
              <Label htmlFor="capital-amount">
                {copy.investments.contributionForm.amount.label}
              </Label>
              <Input
                id="capital-amount"
                value={capitalAmount}
                inputMode="decimal"
                required
                className="num num-right"
                onChange={(event) => setCapitalAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capital-from">{copy.investments.contributionForm.from.label}</Label>
              <Select value={fromAccountCode} onValueChange={setFromAccountCode}>
                <SelectTrigger id="capital-from" className="w-full">
                  <SelectValue placeholder={copy.investments.contributionForm.from.label} />
                </SelectTrigger>
                <SelectContent>
                  {origins.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={addCapital.isPending || fromAccountCode === ''}
              >
                {copy.investments.contributionForm.submit}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(null)}>
                {copy.common.cancel}
              </Button>
            </div>
          </form>
        )}
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {investments.data.map((investment) => (
            <li key={investment.id}>
              <InvestmentCard
                investment={investment}
                onEdit={() => setEditing({ investment })}
                onDelete={() => setDeleting(investment)}
                onAddCapital={() => setAdding(investment)}
              />
            </li>
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
                if (deleting) remove.mutate(deleting)
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
