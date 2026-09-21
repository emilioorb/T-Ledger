import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
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
import { copy } from '@/features/goals/copy'
import type { Goal } from '@/features/goals/types'
import { useContribute, useDeleteGoal, useGoals, useSaveGoal } from '@/features/goals/use-goals'
import { formatIsoDate, today } from '@/lib/dates'
import { parseMoneyInput, type CurrencyCode } from '@/lib/money'
import { cn } from '@/lib/utils'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

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
  const fields = copy.goals.form

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      name,
      target: parseMoneyInput(amount, currency),
      desiredDate,
      priority,
      accountCode: goal?.accountCode ?? null,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
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

      <div className="flex gap-2">
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
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {fields.submit}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {copy.common.cancel}
          </Button>
        </div>
      </div>
    </form>
  )
}

interface CardProps {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
}

// Lo que se lee primero no es el porcentaje sino si llega: la fecha proyectada contra la
// deseada. Una barra al 60 % no responde esa pregunta.
const GoalBlock = ({ goal, onEdit, onDelete, onContribute }: CardProps) => (
  <li className="border-b border-border py-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-sm font-medium tracking-tight">
        <Link to="/metas/$goalId" params={{ goalId: goal.id }} className="underline-offset-2 hover:underline">
          {goal.name}
        </Link>
      </h2>

      {/* La respuesta va acá, al mismo peso que el nombre: el monto es el dato de apoyo.
          El color marca el estado, no la fecha: una fecha no es buena ni mala. */}
      <span className="flex items-baseline gap-2 text-sm">
        {goal.reached ? (
          <span className="text-positive">{copy.goals.reached}</span>
        ) : goal.projectedDate === null ? (
          <Hint text={copy.goals.noPaceHint}>
            <span className="text-muted-foreground">{copy.goals.noPace}</span>
          </Hint>
        ) : (
          <>
            <span className={cn(goal.onTrack ? 'text-positive' : 'text-warning')}>
              {goal.onTrack ? copy.goals.onTrack : copy.goals.late}
            </span>
            <span className="num">{formatIsoDate(goal.projectedDate)}</span>
          </>
        )}
      </span>
    </div>

    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-baseline gap-1.5">
        <Amount money={goal.contributed} />
        <span>de</span>
        <Amount money={goal.target} />
      </span>

      <span>
        {copy.goals.columns.desired}{' '}
        <span className="num">{formatIsoDate(goal.desiredDate)}</span>
      </span>

      {!goal.reached ? (
        <Hint text={copy.goals.requiredHint}>
          <span>
            {copy.goals.columns.required} <Amount money={goal.requiredMonthlyContribution} />
          </span>
        </Hint>
      ) : null}

      <span className="ml-auto flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onContribute}
        >
          {copy.goals.contribute}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={copy.goals.edit(goal.name)}
          onClick={onEdit}
        >
          {copy.goals.form.editTitle}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={copy.goals.delete(goal.name)}
          onClick={onDelete}
        >
          {copy.goals.confirmDelete.confirm}
        </Button>
      </span>
    </div>
  </li>
)

const GoalsScreen = () => {
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionDate, setContributionDate] = useState(today())

  const goals = useGoals()
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
          amount: parseMoneyInput(
            contributionAmount,
            contributing.target.currency as CurrencyCode,
          ),
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

      {editing ? (
        <div className="border-y border-border py-5">
          <h2 className="mb-4 text-base font-medium tracking-tight">
            {editing.goal ? copy.goals.form.editTitle : copy.goals.form.createTitle}
          </h2>
          <GoalForm
            goal={editing.goal}
            pending={save.isPending}
            onSubmit={(values) =>
              save.mutate(
                { id: editing.goal?.id, input: values },
                { onSuccess: () => setEditing(null) },
              )
            }
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {contributing ? (
        <form onSubmit={submitContribution} className="flex flex-wrap items-end gap-3 border-y border-border py-4">
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
            <Label htmlFor="contribution-amount">{copy.goals.contributionForm.amount.label}</Label>
            <Input
              id="contribution-amount"
              value={contributionAmount}
              inputMode="decimal"
              required
              className="num num-right w-40"
              onChange={(event) => setContributionAmount(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {copy.goals.contributionForm.amount.hint}
            </p>
          </div>
          <Button type="submit" size="sm" disabled={contribute.isPending}>
            {copy.goals.contributionForm.submit}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setContributing(null)}>
            {copy.common.cancel}
          </Button>
        </form>
      ) : null}

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
        <ul>
          {goals.data.map((goal) => (
            <GoalBlock
              key={goal.id}
              goal={goal}
              onEdit={() => setEditing({ goal })}
              onDelete={() => setDeleting(goal)}
              onContribute={() => setContributing(goal)}
            />
          ))}
        </ul>
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
                if (deleting) remove.mutate(deleting.id)
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
