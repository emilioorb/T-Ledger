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
import { copy } from './copy'
import type { Installment } from './types'

interface Props {
  installments: Installment[]
}

const columns = copy.schedule.columns

// Dos estructuras, no una tabla con desplazamiento horizontal: una tabla de 120 cuotas
// dentro de un contenedor con overflow-x en un teléfono es ilegible. Se alternan con las
// utilidades responsivas de Tailwind, no midiendo el ancho con JavaScript.
export const AmortizationTable = ({ installments }: Props) => (
  <>
    <div className="hidden md:block">
      <Table>
        <TableCaption className="text-left">{copy.schedule.caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-16">
              {columns.number}
            </TableHead>
            <TableHead scope="col">{columns.dueDate}</TableHead>
            <TableHead scope="col" className="text-right">
              {columns.payment}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {columns.principal}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {columns.interest}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {columns.balance}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((installment) => (
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

    <ul className="divide-y divide-border md:hidden">
      {installments.map((installment) => (
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
