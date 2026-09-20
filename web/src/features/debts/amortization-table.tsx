import { SortButton } from '@/components/sort-button'
import { SortSelect } from '@/components/sort-select'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatIsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useTableControls, type SortValue } from '@/lib/use-table-controls'
import { copy } from './copy'
import type { Installment } from './types'

interface Props {
  installments: Installment[]
}

const columns = copy.schedule.columns

// Sin búsqueda: una tabla de amortización se recorre en orden, no se consulta por palabra.
// Ordenar por interés o saldo sí responde preguntas reales.
const sortable = {
  number: (i: Installment) => i.number,
  dueDate: (i: Installment) => i.dueDate,
  payment: (i: Installment) => BigInt(i.payment.minorUnits),
  principal: (i: Installment) => BigInt(i.principal.minorUnits),
  interest: (i: Installment) => BigInt(i.interest.minorUnits),
  balance: (i: Installment) => BigInt(i.balance.minorUnits),
} satisfies Record<string, (i: Installment) => SortValue>

type ColumnKey = keyof typeof sortable

// Dos estructuras, no una tabla con desplazamiento horizontal: una tabla de 120 cuotas
// dentro de un contenedor con overflow-x en un teléfono es ilegible. Se alternan con las
// utilidades responsivas de Tailwind, no midiendo el ancho con JavaScript.
export const AmortizationTable = ({ installments }: Props) => {
  const table = useTableControls<Installment, ColumnKey>({
    rows: installments,
    columns: sortable,
    initial: { key: 'number', direction: 'asc' },
  })

  const th = (key: ColumnKey, label: string, align: 'left' | 'right' = 'right') => (
    <TableHead
      scope="col"
      className={align === 'right' ? 'text-right' : undefined}
      aria-sort={
        table.sort.key === key
          ? table.sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <SortButton
        label={label}
        align={align}
        active={table.sort.key === key}
        direction={table.sort.direction}
        onClick={() => table.toggle(key)}
      />
    </TableHead>
  )

  return (
  <>
    <div className="hidden md:block">
      <Table>
        <TableCaption className="text-left">{copy.schedule.caption}</TableCaption>
        <TableHeader>
          <TableRow>
            {th('number', columns.number, 'left')}
            {th('dueDate', columns.dueDate, 'left')}
            {th('payment', columns.payment)}
            {th('principal', columns.principal)}
            {th('interest', columns.interest)}
            {th('balance', columns.balance)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((installment) => (
            <TableRow key={installment.number}>
              <TableCell className="num text-left text-muted-foreground">{installment.number}</TableCell>
              <TableCell className="num text-left">{formatIsoDate(installment.dueDate)}</TableCell>
              <TableCell className="num font-medium">{formatMoney(installment.payment)}</TableCell>
              <TableCell className="num">{formatMoney(installment.principal)}</TableCell>
              <TableCell className="num text-muted-foreground">
                {formatMoney(installment.interest)}
              </TableCell>
              <TableCell className="num">{formatMoney(installment.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <SortSelect
        options={[
          { key: 'number', label: columns.number },
          { key: 'dueDate', label: columns.dueDate },
          { key: 'payment', label: columns.payment },
          { key: 'principal', label: columns.principal },
          { key: 'interest', label: columns.interest },
          { key: 'balance', label: columns.balance },
        ]}
        value={table.sort.key}
        direction={table.sort.direction}
        onChange={(key) => table.setSort(key)}
        onFlip={() => table.toggle(table.sort.key)}
      className="mb-2 md:hidden"
    />

    <ul className="divide-y divide-border md:hidden">
      {table.rows.map((installment) => (
        <li key={installment.number} className="py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">
              <span className="text-muted-foreground">{columns.number} </span>
              <span className="num">{installment.number}</span>
            </span>
            <span className="num text-sm">{formatIsoDate(installment.dueDate)}</span>
          </div>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{columns.payment}</dt>
            <dd className="num font-medium">{formatMoney(installment.payment)}</dd>
            <dt className="text-muted-foreground">{columns.principal}</dt>
            <dd className="num">{formatMoney(installment.principal)}</dd>
            <dt className="text-muted-foreground">{columns.interest}</dt>
            <dd className="num text-muted-foreground">{formatMoney(installment.interest)}</dd>
            <dt className="text-muted-foreground">{columns.balance}</dt>
            <dd className="num">{formatMoney(installment.balance)}</dd>
          </dl>
        </li>
      ))}
    </ul>

    {installments.length === 0 && (
      <p className="py-6 text-sm text-muted-foreground">{copy.schedule.empty}</p>
    )}
  </>
  )
}
