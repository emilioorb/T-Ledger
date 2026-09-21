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
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatIsoDate } from '@/lib/dates'
import { copy } from './copy'
import type { CurrencyCode } from './types'

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

// Todos los controles de la barra miden lo mismo de alto: el desplegable en su tamaño por
// omisión. Con `size="sm"` mide cuatro píxeles menos que un campo y la fila queda despareja.
const CONTROL_HEIGHT = 'h-8'

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
      <SelectTrigger id="currency" className={cn(CONTROL_HEIGHT, 'w-24')}>
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
      className={cn(CONTROL_HEIGHT, 'w-[12rem]')}
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
      className={cn(CONTROL_HEIGHT, 'w-[12rem]')}
    />
  </Field>
)

const isoOf = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

const dateOf = (iso: string): Date => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Un rango es una cosa, no dos. Con dos campos hay que elegir dos veces y nada impide que
// la segunda fecha quede antes que la primera; con el calendario de dos meses se ve el
// tramo completo mientras se elige, que es la pregunta que el control responde.
export const RangeFields = ({ from, to, onFrom, onTo }: RangeProps) => {
  const [open, setOpen] = useState(false)
  // El día que ancla la selección en curso. Sin él, el calendario arrastraría el extremo
  // más cercano del rango que ya está puesto, y el primer clic no significaría «desde acá».
  const [anchor, setAnchor] = useState<Date | null>(null)
  const selected: DateRange = { from: dateOf(from), to: dateOf(to) }

  const choose = (day: Date) => {
    if (anchor === null) {
      setAnchor(day)
      // Con una sola punta elegida el rango es ese día: el reporte sigue siendo válido y
      // no queda a medio definir mientras se piensa la segunda.
      onFrom(isoOf(day))
      onTo(isoOf(day))
      return
    }

    const [start, end] = day < anchor ? [day, anchor] : [anchor, day]
    onFrom(isoOf(start))
    onTo(isoOf(end))
    setAnchor(null)
    setOpen(false)
  }

  return (
    <Field id="range" label={copy.common.range.label}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          setAnchor(null)
        }}
      >
        <PopoverTrigger asChild>
          {/* Se viste como los desplegables de al lado a propósito: abre algo, igual que
              ellos, y una fila de controles donde cada uno se ve distinto se lee peor. */}
          <button
            id="range"
            type="button"
            className={cn(
              'flex items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--duration-press) ease-(--ease-out-quart) outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50',
              CONTROL_HEIGHT,
              'w-[16rem]',
            )}
          >
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="num">
                {copy.common.range.value(formatIsoDate(from), formatIsoDate(to))}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={selected}
            defaultMonth={selected.from}
            onDayClick={choose}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}

// El desplegable de filtro que usan todas las pantallas. Existe para que el ancho, la
// etiqueta y el tamaño no se decidan una vez por pantalla y terminen distintos.
export const SelectField = ({ id, label, value, options, onChange }: SelectFieldProps) => (
  <Field id={id} label={label}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={CONTROL_HEIGHT}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
)

// La línea de abajo separa los controles del contenido. Cuando lo que sigue ya abre con su
// propia línea —el bloque de la cifra principal, que la lleva más gruesa— sobra: quedan dos
// reglas a dos centímetros una de otra diciendo lo mismo.
export const ControlBar = ({ children }: { children: ReactNode }) => (
  // Sin línea ni relleno inferior: las once pantallas que usan esta barra pasaban
  // `separated={false}`, y la rama que dibujaba la línea era código muerto que invitaba a
  // reintroducirla. Los controles se despegan con el espaciado de la pantalla.
  <div className="flex flex-wrap items-end gap-x-4 gap-y-3">{children}</div>
)
