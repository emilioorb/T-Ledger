import { queryKeys } from '@/lib/query-keys'
import { loUltimoDe, useAlCargarLoUltimo } from '@/lib/usar-lo-ultimo'
import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Coins, Plus, Target } from 'lucide-react'
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
import { usePrimaryAction } from '@/features/shortcuts/primary-action'
import { copy } from '@/features/goals/copy'
import type { Goal } from '@/features/goals/types'
import { usePostableAssets } from '@/features/accounting/use-accounting'
import { useContribute, useDeleteGoal, useGoals, useSaveGoal } from '@/features/goals/use-goals'
import { formatIsoDate, today } from '@/lib/dates'
import { formatMoney, parseMoneyInput, type CurrencyCode } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/progress-bar'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

// Radix no acepta un item con valor vacío, y «sin cuenta» es una opción real.
const NO_ACCOUNT = '__ninguna__'

interface GoalFormValues {
  name: string
  target: { minorUnits: string; currency: CurrencyCode }
  desiredDate: string
  priority: number
  accountCode: string | null
}

interface FormProps {
  goal?: Goal
  pending: boolean
  onSubmit: (values: GoalFormValues) => void
  onCancel: () => void
}

const GoalForm = ({ goal, pending, onSubmit, onCancel }: FormProps) => {
  const [name, setName] = useState(goal?.name ?? '')
  const [amount, setAmount] = useState(goal ? goal.target.minorUnits.slice(0, -2) : '')
  const [currency, setCurrency] = useState<CurrencyCode>(
    (goal?.target.currency as CurrencyCode) ?? 'CRC',
  )
  const [desiredDate, setDesiredDate] = useState(goal?.desiredDate ?? today())
  const [priority, setPriority] = useState(goal?.priority ?? 1)
  const [accountCode, setAccountCode] = useState(goal?.accountCode ?? '')
  const fields = copy.goals.form
  const savings = usePostableAssets()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      name,
      target: parseMoneyInput(amount, currency),
      desiredDate,
      priority,
      accountCode: accountCode === '' ? null : accountCode,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">{fields.name.label}</Label>
        <Input
          id="goal-name"
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-target">{fields.target.label}</Label>
        <div className="flex gap-2">
          <Input
            id="goal-target"
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
        <Label htmlFor="goal-date">{fields.desiredDate.label}</Label>
        <Input
          id="goal-date"
          type="date"
          value={desiredDate}
          required
          onChange={(event) => setDesiredDate(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-account">{fields.accountCode.label}</Label>
        <Select
          value={accountCode === '' ? NO_ACCOUNT : accountCode}
          onValueChange={(next) => setAccountCode(next === NO_ACCOUNT ? '' : next)}
        >
          <SelectTrigger id="goal-account" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ACCOUNT}>{fields.noAccount}</SelectItem>
            {savings.map((account) => (
              <SelectItem key={account.code} value={account.code}>
                {account.code} · {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{fields.accountCode.hint}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-priority">{fields.priority.label}</Label>
        <Input
          id="goal-priority"
          type="number"
          min={0}
          value={priority}
          className="w-20"
          onChange={(event) => setPriority(Number(event.target.value))}
        />
        <p className="text-xs text-muted-foreground">{fields.priority.hint}</p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
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
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
  onToggle: () => void
}

// Lo que se lee primero no es el porcentaje sino si llega: la fecha proyectada contra la
// deseada, arriba y con peso. La barra va debajo porque responde otra pregunta —cuánto
// llevás— que importa después.
const progressOf = (goal: Goal): number => {
  const target = Number(goal.target.minorUnits)
  if (target <= 0) return 0
  return Math.min(Math.max(Number(goal.contributed.minorUnits) / target, 0), 1)
}

const GoalStatus = ({ goal }: { goal: Goal }) => {
  if (!goal.active) return <span className="text-muted-foreground">{copy.goals.paused}</span>
  if (goal.reached) return <span className="text-positive">{copy.goals.reached}</span>
  if (goal.projectedDate === null)
    return (
      <Hint text={copy.goals.noPaceHint}>
        <span className="text-muted-foreground">{copy.goals.noPace}</span>
      </Hint>
    )
  return (
    <span className={cn(goal.onTrack ? 'text-positive' : 'text-warning')}>
      {goal.onTrack ? copy.goals.onTrack : copy.goals.late}
    </span>
  )
}

interface ActionProps {
  children: string
  label?: string
  onClick: () => void
}

const GoalAction = ({ children, label, onClick }: ActionProps) => (
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

const GoalBlock = ({ goal, onEdit, onDelete, onContribute, onToggle }: CardProps) => {
  const progress = progressOf(goal)

  return (
    // En pausa se atenúa pero sigue legible: el avance guardado importa para cuando vuelva.
    <Card size="sm" className={cn('gap-0 px-4', !goal.active && 'opacity-70')}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-medium tracking-tight">
          <Link
            to="/metas/$goalId"
            params={{ goalId: goal.id }}
            className="underline-offset-2 hover:underline"
          >
            {goal.name}
          </Link>
        </h2>
        {/* El color marca el estado, no la fecha: una fecha no es buena ni mala. */}
        <span className="shrink-0 text-xs">
          <GoalStatus goal={goal} />
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">{copy.goals.projected}</p>
        <p className="num mt-1 text-2xl leading-none tracking-tight">
          {goal.projectedDate ? formatIsoDate(goal.projectedDate) : '—'}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {copy.goals.columns.desired}{' '}
          <span className="num">{formatIsoDate(goal.desiredDate)}</span>
        </p>
      </div>

      {/* Los extremos de la barra son los extremos del texto: lo aportado empieza donde
          empieza la barra y el objetivo termina donde termina. */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="flex items-baseline gap-1.5">
            <Amount money={goal.contributed} />
            <span className="num text-muted-foreground">{Math.round(progress * 100)}%</span>
          </span>
          <span className="text-muted-foreground">
            <Amount money={goal.target} />
          </span>
        </div>
        <ProgressBar
          className="mt-1.5"
          value={progress}
          tone={goal.reached ? 'positive' : 'plain'}
          label={copy.goals.progressLabel(formatMoney(goal.contributed), formatMoney(goal.target))}
        />
      </div>

      {/* Se parte en dos renglones cuando no entra: el aporte y cuatro acciones no caben en
          un teléfono angosto, y se salían de la tarjeta. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-3">
        {!goal.active ? (
          <span className="text-xs text-muted-foreground">{copy.goals.pausedNote}</span>
        ) : goal.reached ? (
          <span className="text-xs text-muted-foreground">{copy.goals.reachedNote}</span>
        ) : (
          <Hint text={copy.goals.requiredHint}>
            <span className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
              {copy.goals.columns.required}
              <Amount money={goal.requiredMonthlyContribution} />
            </span>
          </Hint>
        )}

        <div className="-mr-2 ml-auto flex shrink-0 gap-0.5">
          {goal.active ? (
            <GoalAction onClick={onContribute}>{copy.goals.contribute}</GoalAction>
          ) : null}
          <GoalAction
            label={goal.active ? copy.goals.pauseLabel(goal.name) : copy.goals.resumeLabel(goal.name)}
            onClick={onToggle}
          >
            {goal.active ? copy.goals.pause : copy.goals.resume}
          </GoalAction>
          <GoalAction label={copy.goals.edit(goal.name)} onClick={onEdit}>
            {copy.common.edit}
          </GoalAction>
          <GoalAction label={copy.goals.delete(goal.name)} onClick={onDelete}>
            {copy.goals.deleteShort}
          </GoalAction>
        </div>
      </div>
    </Card>
  )
}

const GoalsScreen = () => {
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionDate, setContributionDate] = useState(today())
  const [fromAccountCode, setFromAccountCode] = useState('')

  const goals = useGoals()

  // La de ahorro de la meta no puede ser el origen: el traslado sería de ella a ella misma.
  const origins = usePostableAssets().filter(
    (account) => account.code !== contributing?.accountCode,
  )
  usePrimaryAction(copy.goals.new, () => setEditing({}))
  // Rearmar el formulario abierto con la versión que guardó la otra persona.
  useAlCargarLoUltimo((cache) =>
    setEditing((actual) => {
      const nueva = actual?.goal && loUltimoDe<Goal>(cache, queryKeys.goals.all, actual.goal.id)
      return nueva ? { goal: nueva } : actual
    }),
  )
  const save = useSaveGoal()
  const contribute = useContribute()
  const remove = useDeleteGoal()

  const submitContribution = (event: FormEvent) => {
    event.preventDefault()
    if (!contributing) return
    contribute.mutate(
      {
        id: contributing.id,
        input: {
          date: contributionDate,
          amount: parseMoneyInput(contributionAmount, contributing.target.currency as CurrencyCode),
          fromAccountCode,
        },
      },
      {
        onSuccess: () => {
          setContributing(null)
          setContributionAmount('')
        },
      },
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.goals.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.goals.description}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          {copy.goals.new}
        </Button>
      </header>

      <FormDialog
        icon={Target}
        open={editing !== null}
        title={editing?.goal ? copy.goals.form.editTitle : copy.goals.form.createTitle}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing ? (
          <GoalForm
            key={editing.goal ? `${editing.goal.id}-${editing.goal.version}` : 'nueva'}
            goal={editing.goal}
            pending={save.isPending}
            onSubmit={(values) =>
              save.mutate(
                // Al editar, la versión que se vio: si otra persona guardó antes, 409 y el aviso
                // ofrece cargar lo último.
                { id: editing.goal?.id, input: editing.goal ? { ...values, version: editing.goal.version } : values },
                { onSuccess: () => setEditing(null) },
              )
            }
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </FormDialog>

      <FormDialog
        icon={Coins}
        open={contributing !== null}
        title={copy.goals.contributionForm.title}
        description={copy.goals.contributionForm.description}
        onOpenChange={(open) => !open && setContributing(null)}
      >
        {contributing && contributing.accountCode === null ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {copy.goals.contributionForm.needsAccount}
            </p>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  const goal = contributing
                  setContributing(null)
                  setEditing({ goal })
                }}
              >
                {copy.goals.contributionForm.editGoal}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitContribution} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contribution-date">{copy.goals.contributionForm.date.label}</Label>
              <Input
                id="contribution-date"
                type="date"
                value={contributionDate}
                required
                onChange={(event) => setContributionDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contribution-amount">
                {copy.goals.contributionForm.amount.label}
              </Label>
              <Input
                id="contribution-amount"
                value={contributionAmount}
                inputMode="decimal"
                required
                className="num num-right"
                onChange={(event) => setContributionAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contribution-from">{copy.goals.contributionForm.from.label}</Label>
              <Select value={fromAccountCode} onValueChange={setFromAccountCode}>
                <SelectTrigger id="contribution-from" className="w-full">
                  <SelectValue placeholder={copy.goals.contributionForm.from.label} />
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
                disabled={contribute.isPending || fromAccountCode === ''}
              >
                {copy.goals.contributionForm.submit}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setContributing(null)}>
                {copy.common.cancel}
              </Button>
            </div>
          </form>
        )}
      </FormDialog>

      {goals.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : goals.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void goals.refetch()}
        />
      ) : goals.data.length === 0 ? (
        <EmptyState
          title={copy.goals.empty.title}
          description={copy.goals.empty.description}
          action={
            <Button size="sm" onClick={() => setEditing({})}>
              {copy.goals.empty.action}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.data.map((goal) => (
            <GoalBlock
              key={goal.id}
              goal={goal}
              onEdit={() => setEditing({ goal })}
              onDelete={() => setDeleting(goal)}
              onContribute={() => setContributing(goal)}
              onToggle={() => save.mutate({ id: goal.id, input: { active: !goal.active } })}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.goals.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.goals.confirmDelete.description(deleting?.name ?? '')}
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
              {copy.goals.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export const Route = createFileRoute('/metas/')({ component: GoalsScreen })
