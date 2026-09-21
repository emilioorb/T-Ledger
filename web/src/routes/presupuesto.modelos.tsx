import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Hint } from '@/components/hint'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { usePrimaryAction } from '@/features/shortcuts/primary-action'
import { copy } from '@/features/budget/copy'
import type { BudgetModel } from '@/features/budget/types'
import { useBudgetModels, useMonthlyIncome, useSaveBudgetModel } from '@/features/budget/use-budget'
import { useAccounts } from '@/features/accounting/use-accounting'
import { today } from '@/lib/dates'
import { formatMoney, type MoneyDto } from '@/lib/money'
import { cn } from '@/lib/utils'

interface BucketDraft {
  id: string
  name: string
  percentage: string
  isSavings: boolean
  accountCodes: string[]
  persisted: boolean
}

// El id es un detalle de implementación: se deriva del nombre. El de una cubeta ya guardada
// no se toca, porque es lo que ata el histórico de consumo a esa cubeta.
const slugify = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const emptyBucket = (): BucketDraft => ({
  id: '',
  name: '',
  percentage: '0',
  isSavings: false,
  accountCodes: [],
  persisted: false,
})

const shareOf = (income: MoneyDto, percentage: string): MoneyDto => {
  const share =
    (BigInt(income.minorUnits) * BigInt(Math.round((Number(percentage) || 0) * 100))) / 10000n
  return { minorUnits: share.toString(), currency: income.currency }
}

const sumOf = (buckets: BucketDraft[]): number =>
  buckets.reduce((acc, bucket) => acc + (Number(bucket.percentage) || 0), 0)

interface FormProps {
  model?: BudgetModel
  income: MoneyDto | null
  postable: { code: string; name: string }[]
  pending: boolean
  onSubmit: (values: { name: string; active: boolean; buckets: BucketDraft[] }) => void
  onCancel: () => void
}

const ModelForm = ({ model, income, postable, pending, onSubmit, onCancel }: FormProps) => {
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
          persisted: true,
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
            <Checkbox
              id="model-active"
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
            />
            {fields.activate}
          </Label>
          <p className="text-xs text-muted-foreground">{copy.models.activeHint}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium tracking-tight">{fields.buckets}</h3>
        <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">{fields.accountsHint}</p>

        <ul className="mt-3 divide-y divide-border">
          {buckets.map((bucket, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <li
              key={index}
              className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_6rem_auto]"
            >
              <Input
                value={bucket.name}
                required
                aria-label={fields.bucketName}
                placeholder={fields.bucketNamePlaceholder}
                onChange={(event) =>
                  update(index, {
                    name: event.target.value,
                    ...(bucket.persisted ? {} : { id: slugify(event.target.value) }),
                  })
                }
              />
              <div>
                <Input
                  value={bucket.percentage}
                  inputMode="decimal"
                  required
                  aria-label={fields.percentage}
                  className="num num-right"
                  onChange={(event) => update(index, { percentage: event.target.value })}
                />
              </div>
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

              <div className="sm:col-span-3">
                {income ? (
                  <p className="text-xs text-muted-foreground">
                    {fields.inColones(formatMoney(shareOf(income, bucket.percentage)))}
                  </p>
                ) : null}
                <Label className="mt-1 flex items-center gap-2 text-xs font-normal">
                  <Checkbox
                    checked={bucket.isSavings}
                    onCheckedChange={(checked) => update(index, { isSavings: checked === true })}
                  />
                  <Hint text={fields.isSavingsHint}>
                    <span>{fields.isSavings}</span>
                  </Hint>
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{fields.accounts}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {postable.map((account) => (
                    <Label
                      key={account.code}
                      className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground"
                    >
                      <Checkbox
                        checked={bucket.accountCodes.includes(account.code)}
                        onCheckedChange={(checked) =>
                          update(index, {
                            accountCodes:
                              checked === true
                                ? [...bucket.accountCodes, account.code]
                                : bucket.accountCodes.filter((code) => code !== account.code),
                          })
                        }
                      />
                      <span className="num">{account.code}</span> {account.name}
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-border py-3 text-sm">
        <span className="text-xs text-muted-foreground">{fields.total}</span>
        <span className={cn('num', balanced ? 'text-positive' : 'text-negative')}>{total}%</span>
        {!balanced ? <span className="text-xs text-negative">{fields.unbalancedHint}</span> : null}
        {balanced && !savings ? (
          <span className="text-xs text-negative">{fields.savingsMissing}</span>
        ) : null}
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

// Un modelo es un reparto del cien por ciento, no una lista de números. La barra lo dice de
// un vistazo y hace comparables dos modelos puestos uno al lado del otro; los porcentajes
// quedan debajo para el que quiera el dato exacto.
//
// Los tramos se distinguen por luminancia y no por matiz. No se toman de la rampa en orden
// —dos escalones seguidos casi no se diferencian en una barra tan fina— sino salteados, y
// entre tramo y tramo queda una hendidura del color de la tarjeta para que el límite se vea
// aunque los tonos se parezcan.
// El naranja y el verde que la app ya usa, y ningún rojo: una cubeta no es buena ni mala, y
// en rojo parecería que algo está mal. El nombre va siempre al lado: el color ordena, no informa.
const TONES = ['bg-bucket-1', 'bg-bucket-2', 'bg-bucket-3', 'bg-bucket-4', 'bg-bucket-5']

const toneOf = (index: number): string => TONES[index % TONES.length] ?? TONES[0]!
const ModelCard = ({ model, onEdit }: { model: BudgetModel; onEdit: () => void }) => (
  // La tarjeta entera abre el editor: con una sola acción posible, un botón aparte es un
  // blanco más chico para lo mismo. Teclado incluido, que si no queda fuera del alcance.
  <Card
    size="sm"
    role="button"
    tabIndex={0}
    aria-label={copy.models.edit(model.name)}
    onClick={onEdit}
    onKeyDown={(event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onEdit()
    }}
    // El hover avisa que la tarjeta entera se puede tocar. Se nombran las propiedades una por
    // una: `transition-colors` no incluye la sombra, así que el anillo saltaba de golpe
    // mientras el fondo se desvanecía, y ese desfase es lo que se veía mal.
    //
    // El `active` es el que hace que se sienta apretada. Baja poco —es una superficie grande,
    // y un 0,97 en algo de este tamaño se bambolea— y vuelve rápido.
    className="cursor-pointer gap-3 px-4 text-left outline-none transition-[background-color,box-shadow,transform] duration-150 ease-out-quart hover:bg-accent hover:ring-foreground/25 active:scale-[0.995] active:duration-100 focus-visible:ring-3 focus-visible:ring-ring/50"
  >
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={cn('text-base', model.active && 'font-medium')}>{model.name}</h2>
      {model.active ? <span className="text-xs text-positive">{copy.models.active}</span> : null}
    </div>

    <div
      className="flex h-2.5 w-full gap-px overflow-hidden rounded-sm"
      role="img"
      aria-label={model.buckets.map((b) => `${b.name} ${b.percentage}%`).join(', ')}
    >
      {model.buckets.map((bucket, index) => (
        <span
          key={bucket.id}
          className={cn('first:rounded-l-sm last:rounded-r-sm', toneOf(index))}
          style={{ width: `${Number(bucket.percentage)}%` }}
        />
      ))}
    </div>

    <ul className="space-y-1">
      {model.buckets.map((bucket, index) => (
        <li key={bucket.id} className="flex items-baseline justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-[2px] ring-1 ring-foreground/10',
                toneOf(index),
              )}
              aria-hidden="true"
            />
            <span className="truncate text-muted-foreground">
              {bucket.name}
              {bucket.isSavings && bucket.name !== copy.budget.savingsBucket
                ? ` · ${copy.budget.savingsBucket}`
                : ''}
            </span>
          </span>
          <span className="num shrink-0">{bucket.percentage}%</span>
        </li>
      ))}
    </ul>
  </Card>
)

const ModelsScreen = () => {
  const [editing, setEditing] = useState<{ model?: BudgetModel } | null>(null)

  usePrimaryAction(copy.models.new, () => setEditing({}))

  const models = useBudgetModels()
  const accounts = useAccounts()
  const income = useMonthlyIncome(today().slice(0, 7))
  const save = useSaveBudgetModel()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const postable = all
    .filter(
      (account) =>
        account.active &&
        !parents.has(account.code) &&
        (account.accountClass === 'OPERATING_EXPENSE' ||
          account.accountClass === 'COST_OF_REVENUE'),
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
        <Card size="sm" className="gap-4 px-4">
          <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
            <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {editing.model ? copy.models.form.editTitle : copy.models.form.createTitle}
          </h2>
          <ModelForm
            model={editing.model}
            income={income.data?.amount ?? null}
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
        </Card>
      ) : null}

      {/* Con el editor abierto la lista sobra: la tarjeta de abajo repetiría el modelo que
          se está editando, y ya se sabe cuál es. */}
      {editing ? null : models.isPending ? (
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.data.map((model) => (
            <ModelCard key={model.id} model={model} onEdit={() => setEditing({ model })} />
          ))}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/presupuesto/modelos')({ component: ModelsScreen })
