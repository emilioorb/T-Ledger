import type { ReactNode } from 'react'
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
import type { CurrencyCode } from './types'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

interface FieldProps {
  id: string
  label: string
  children: ReactNode
}

// Los controles de un reporte no son un formulario: no se envían, se leen y el reporte
// cambia. Por eso van en una barra fina y no en una tarjeta con botón.
const Field = ({ id, label, children }: FieldProps) => (
  <div className="flex flex-col gap-1">
    <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
)

interface CurrencyProps {
  value: CurrencyCode
  onChange: (currency: CurrencyCode) => void
}

export const CurrencyField = ({ value, onChange }: CurrencyProps) => (
  <Field id="currency" label={copy.common.currency.label}>
    <Select value={value} onValueChange={(next) => onChange(next as CurrencyCode)}>
      <SelectTrigger id="currency" size="sm" className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
)

interface DateProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

export const DateField = ({ id, label, value, onChange }: DateProps) => (
  <Field id={id} label={label}>
    <Input
      id={id}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-[9.25rem] sm:w-[10.5rem]"
    />
  </Field>
)

interface RangeProps {
  from: string
  to: string
  onFrom: (value: string) => void
  onTo: (value: string) => void
}

// Un mes no es un día: pedirlo con selector de día obliga a elegir un número que no se usa.
export const MonthField = ({ id, label, value, onChange }: DateProps) => (
  <Field id={id} label={label}>
    <Input
      id={id}
      type="month"
      value={value.slice(0, 7)}
      onChange={(event) => onChange(`${event.target.value}-01`)}
      className="h-8 w-[12rem]"
    />
  </Field>
)

export const RangeFields = ({ from, to, onFrom, onTo }: RangeProps) => (
  <>
    <DateField id="from" label={copy.common.from} value={from} onChange={onFrom} />
    <DateField id="to" label={copy.common.to} value={to} onChange={onTo} />
  </>
)

export const ControlBar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-border pb-4">
    {children}
  </div>
)
