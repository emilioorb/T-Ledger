import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  XAxis,
  YAxis,
} from '@/components/charts'
import { formatIsoMonth } from '@/lib/dates'
import { copy } from './copy'
import type { MonthResult } from './use-monthly-results'

const SYMBOL: Record<string, string> = { CRC: '₡', USD: '$' }

const compact = (value: number, currency: string): string => {
  const symbol = SYMBOL[currency] ?? ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${symbol}${Math.round(value / 1_000)}k`
  return `${symbol}${Math.round(value)}`
}

// Dos barras por mes y no una de saldo neto: el neto esconde si un mes bueno lo fue porque
// entró más o porque se gastó menos, que son dos historias distintas.
const config = {
  income: { label: copy.incomeStatement.income, color: 'var(--chart-2)' },
  spending: { label: copy.incomeStatement.operatingExpenses, color: 'var(--chart-1)' },
}

interface Props {
  months: MonthResult[]
  currency: string
  label: string
}

export const IncomeVsSpendingChart = ({ months, currency, label }: Props) => {
  const data = months.map((month) => ({
    month: formatIsoMonth(month.period),
    income: Number(month.statement?.income.minorUnits ?? 0) / 100,
    spending:
      (Number(month.statement?.operatingExpenses.minorUnits ?? 0) +
        Number(month.statement?.costOfRevenue.minorUnits ?? 0)) /
      100,
  }))

  return (
    <ChartContainer config={config} className="h-48 w-full" role="img" aria-label={label}>
      <BarChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(value: number) => compact(value, currency)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="spending" fill="var(--color-spending)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
