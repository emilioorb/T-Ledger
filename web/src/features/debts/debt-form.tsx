import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseMoneyInput } from '@/lib/money'
import { copy } from './copy'
import type { DebtInput } from './types'

const fields = copy.form.fields

const schema = z.object({
  direction: z.enum(['BORROWED', 'LENT']),
  name: z.string().trim().min(1),
  counterparty: z.string().trim().min(1),
  principal: z.string().trim().min(1),
  currency: z.enum(['CRC', 'USD']),
  annualRate: z.string().regex(/^\d+([.,]\d+)?$/),
  compounding: z.enum(['MONTHLY', 'ANNUAL']),
  termMonths: z.coerce.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['FRENCH', 'FIXED_PRINCIPAL', 'INTEREST_FREE']),
  budgetBucket: z.string().trim(),
})

type FormValues = z.input<typeof schema>

interface Props {
  onSubmit: (input: DebtInput) => void
  onCancel?: () => void
  pending?: boolean
  defaults?: Partial<FormValues>
  submitLabel?: string
}

const emptyValues: FormValues = {
  direction: 'BORROWED',
  name: '',
  counterparty: '',
  principal: '',
  currency: 'CRC',
  annualRate: '0',
  compounding: 'MONTHLY',
  termMonths: 12,
  startDate: new Date().toISOString().slice(0, 10),
  kind: 'FRENCH',
  budgetBucket: '',
}

export const DebtForm = ({ onSubmit, onCancel, pending, defaults, submitLabel }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyValues, ...defaults },
  })

  const direction = form.watch('direction')
  const isLent = direction === 'LENT'

  const submit = form.handleSubmit((values) => {
    try {
      onSubmit({
        name: values.name,
        counterparty: values.counterparty,
        principal: parseMoneyInput(values.principal, values.currency),
        annualRate: values.annualRate.replace(',', '.'),
        compounding: values.compounding,
        termMonths: Number(values.termMonths),
        startDate: values.startDate,
        kind: values.kind,
        direction: values.direction,
        // El backend rechaza LENT con cubeta: la interfaz no ofrece ese camino.
        budgetBucket: isLent ? null : values.budgetBucket,
      })
    } catch {
      toast.error(copy.toast.invalidAmount)
    }
  })

  const error = (name: keyof FormValues) => form.formState.errors[name]

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{fields.direction.label}</legend>
        <RadioGroup
          value={direction}
          onValueChange={(value) => form.setValue('direction', value as FormValues['direction'])}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="BORROWED" id="dir-borrowed" />
            <Label htmlFor="dir-borrowed" className="font-normal">
              {fields.direction.borrowed}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="LENT" id="dir-lent" />
            <Label htmlFor="dir-lent" className="font-normal">
              {fields.direction.lent}
            </Label>
          </div>
        </RadioGroup>
      </fieldset>

      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">{fields.name.label}</Label>
          <Input id="name" aria-invalid={Boolean(error('name'))} {...form.register('name')} />
          <p className="text-xs text-muted-foreground">{fields.name.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counterparty">{fields.counterparty.label}</Label>
          <Input
            id="counterparty"
            aria-invalid={Boolean(error('counterparty'))}
            {...form.register('counterparty')}
          />
          <p className="text-xs text-muted-foreground">{fields.counterparty.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="principal">{fields.principal.label}</Label>
          <div className="flex gap-2">
            <Input
              id="principal"
              inputMode="decimal"
              className="num"
              aria-invalid={Boolean(error('principal'))}
              {...form.register('principal')}
            />
            <Select
              value={form.watch('currency')}
              onValueChange={(value) => form.setValue('currency', value as FormValues['currency'])}
            >
              <SelectTrigger className="w-24" aria-label={fields.currency.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRC">CRC</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{fields.principal.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="annualRate">{fields.annualRate.label}</Label>
          <Input
            id="annualRate"
            inputMode="decimal"
            className="num"
            aria-invalid={Boolean(error('annualRate'))}
            {...form.register('annualRate')}
          />
          <p className="text-xs text-muted-foreground">{fields.annualRate.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="termMonths">{fields.termMonths.label}</Label>
          <Input
            id="termMonths"
            type="number"
            min={1}
            className="num"
            aria-invalid={Boolean(error('termMonths'))}
            {...form.register('termMonths')}
          />
          <p className="text-xs text-muted-foreground">{fields.termMonths.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="startDate">{fields.startDate.label}</Label>
          <Input
            id="startDate"
            type="date"
            className="num"
            aria-invalid={Boolean(error('startDate'))}
            {...form.register('startDate')}
          />
          <p className="text-xs text-muted-foreground">{fields.startDate.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="kind">{fields.kind.label}</Label>
          <Select
            value={form.watch('kind')}
            onValueChange={(value) => form.setValue('kind', value as FormValues['kind'])}
          >
            <SelectTrigger id="kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FRENCH">{fields.kind.french}</SelectItem>
              <SelectItem value="FIXED_PRINCIPAL">{fields.kind.fixedPrincipal}</SelectItem>
              <SelectItem value="INTEREST_FREE">{fields.kind.interestFree}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="compounding">{fields.compounding.label}</Label>
          <Select
            value={form.watch('compounding')}
            onValueChange={(value) =>
              form.setValue('compounding', value as FormValues['compounding'])
            }
          >
            <SelectTrigger id="compounding" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">{fields.compounding.monthly}</SelectItem>
              <SelectItem value="ANNUAL">{fields.compounding.annual}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isLent ? (
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="budgetBucket">{fields.budgetBucket.label}</Label>
            <Input
              id="budgetBucket"
              aria-invalid={Boolean(error('budgetBucket'))}
              {...form.register('budgetBucket')}
            />
            <p className="text-xs text-muted-foreground">{fields.budgetBucket.hint}</p>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel ?? copy.form.submitCreate}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {copy.form.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
