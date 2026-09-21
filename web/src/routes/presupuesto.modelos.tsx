import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/features/budget/copy'
import type { BudgetModel } from '@/features/budget/types'
import { useBudgetModels, useSaveBudgetModel } from '@/features/budget/use-budget'
import { useAccounts } from '@/features/accounting/use-accounting'
import { cn } from '@/lib/utils'

interface BucketDraft {
  id: string
  name: string
  percentage: string
  isSavings: boolean
  accountCodes: string[]
}

const emptyBucket = (): BucketDraft => ({
  id: '',
  name: '',
  percentage: '0',
  isSavings: false,
  accountCodes: [],
})

const sumOf = (buckets: BucketDraft[]): number =>
  buckets.reduce((acc, bucket) => acc + (Number(bucket.percentage) || 0), 0)

interface FormProps {
  model?: BudgetModel
  postable: { code: string; name: string }[]
  pending: boolean
  onSubmit: (values: { name: string; active: boolean; buckets: BucketDraft[] }) => void
  onCancel: () => void
}

const ModelForm = ({ model, postable, pending, onSubmit, onCancel }: FormProps) => {
  const [name, setName] = useState(model?.name ?? '')
  const [active, setActive] = useState(model?.active ?? false)
  const [buckets, setBuckets] = useState<BucketDraft[]>(
    model
      ? model.buckets.map((bucket) => ({
          id: bucket.id,
          name: bucket.name,
          percentage: bucket.percentage,
          isSavings: bucket.isSavings,
          accountCodes: [...bucket.accountCodes],
        }))
      : [emptyBucket()],
  )

  const fields = copy.models.form
  const total = sumOf(buckets)
  const balanced = total === 100
  const savings = buckets.filter((bucket) => bucket.isSavings).length === 1

  const update = (index: number, patch: Partial<BucketDraft>) =>
    setBuckets((current) =>
      current.map((bucket, at) => (at === index ? { ...bucket, ...patch } : bucket)),
    )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ name, active, buckets })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="model-name">{fields.name.label}</Label>
          <Input
            id="model-name"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{fields.name.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model-active" className="flex items-center gap-2">
            <input
              id="model-active"
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 accent-foreground"
            />
            {fields.activate}
          </Label>
          <p className="text-xs text-muted-foreground">{copy.models.activeHint}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium tracking-tight">{fields.buckets}</h3>
        <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">{fields.accountsHint}</p>

        <ul className="mt-3 space-y-3">
          {buckets.map((bucket, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={index} className="grid gap-2 border-b border-border pb-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
              <Input
                value={bucket.id}
                required
                aria-label={`${fields.bucketName} interno`}
                placeholder="necesidades"
                onChange={(event) => update(index, { id: event.target.value })}
              />
              <Input
                value={bucket.name}
                required
                aria-label={fields.bucketName}
                placeholder="Necesidades"
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <Input
                value={bucket.percentage}
                inputMode="decimal"
                required
                aria-label={fields.percentage}
                className="num"
                onChange={(event) => update(index, { percentage: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={fields.removeBucket(bucket.name || fields.bucketName)}
                disabled={buckets.length <= 1}
                onClick={() => setBuckets((current) => current.filter((_, at) => at !== index))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>

              <div className="sm:col-span-4">
                <Label className="flex items-center gap-2 text-xs font-normal">
                  <input
                    type="checkbox"
                    checked={bucket.isSavings}
                    onChange={(event) => update(index, { isSavings: event.target.checked })}
                    className="size-3.5 accent-foreground"
                  />
                  {fields.isSavings}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{fields.accounts}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {postable.map((account) => (
                    <Label
                      key={account.code}
                      className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={bucket.accountCodes.includes(account.code)}
                        onChange={(event) =>
                          update(index, {
                            accountCodes: event.target.checked
                              ? [...bucket.accountCodes, account.code]
                              : bucket.accountCodes.filter((code) => code !== account.code),
                          })
                        }
                        className="size-3.5 accent-foreground"
                      />
                      <span className="num text-left">{account.code}</span> {account.name}
                    </Label>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setBuckets((current) => [...current, emptyBucket()])}
        >
          {fields.addBucket}
        </Button>
      </div>

      {/* La suma se ve mientras se edita: descubrir el error al enviar es mala interfaz. */}
      <div className="flex items-baseline gap-3 border-y border-border py-3 text-sm">
        <span className="text-xs text-muted-foreground">{fields.total}</span>
        <span className={cn('num text-left', balanced ? 'text-positive' : 'text-negative')}>
          {balanced ? fields.balanced : fields.unbalanced(String(total))}
        </span>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !balanced || !savings}>
          {fields.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}

const ModelsScreen = () => {
  const [editing, setEditing] = useState<{ model?: BudgetModel } | null>(null)

  const models = useBudgetModels()
  const accounts = useAccounts()
  const save = useSaveBudgetModel()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const postable = all
    .filter(
      (account) =>
        account.active &&
        !parents.has(account.code) &&
        (account.accountClass === 'OPERATING_EXPENSE' || account.accountClass === 'COST_OF_REVENUE'),
    )
    .map((account) => ({ code: account.code, name: account.name }))

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.models.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.models.description}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          {copy.models.new}
        </Button>
      </header>

      {editing ? (
        <div className="border-y border-border py-5">
          <h2 className="mb-4 text-base font-medium tracking-tight">
            {editing.model ? copy.models.form.editTitle : copy.models.form.createTitle}
          </h2>
          <ModelForm
            model={editing.model}
            postable={postable}
            pending={save.isPending}
            onSubmit={(values) =>
              save.mutate(
                { id: editing.model?.id, input: values },
                { onSuccess: () => setEditing(null) },
              )
            }
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {models.isPending ? (
        <div className="space-y-2" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : models.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void models.refetch()}
        />
      ) : models.data.length === 0 ? (
        <EmptyState
          title={copy.models.empty.title}
          description={copy.models.empty.description}
          action={
            <Button size="sm" onClick={() => setEditing({})}>
              {copy.models.empty.action}
            </Button>
          }
        />
      ) : (
        <ul>
          {models.data.map((model) => (
            <li key={model.id} className="border-b border-border py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-2">
                  <span className={cn('text-sm', model.active && 'font-medium')}>{model.name}</span>
                  {model.active ? (
                    <span className="text-xs text-positive">{copy.models.active}</span>
                  ) : null}
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing({ model })}
                  >
                    {copy.models.form.editTitle}
                  </Button>
                </span>
              </div>

              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {model.buckets.map((bucket) => (
                  <li key={bucket.id}>
                    {bucket.name} <span className="num text-left">{bucket.percentage}%</span>
                    {bucket.isSavings ? ` · ${copy.budget.savingsBucket}` : ''}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const Route = createFileRoute('/presupuesto/modelos')({ component: ModelsScreen })
