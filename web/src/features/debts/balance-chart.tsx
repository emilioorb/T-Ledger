import {
  Area,
  AreaChart,
  CartesianGrid,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  XAxis,
  YAxis,
} from '@/components/charts'
import { formatIsoMonth } from '@/lib/dates'
import { copy } from './copy'
import type { Installment } from './types'

interface Props {
  installments: Installment[]
}

// La Regla del Gráfico: se usa el envoltorio chart de shadcn, que es el que aporta los
// tokens del tema y el tooltip accesible. Una sola serie, distinguida por luminancia.
const config = {
  balance: { label: copy.schedule.columns.balance, color: 'var(--chart-1)' },
}

const SYMBOL: Record<string, string> = { CRC: '₡', USD: '$' }

// El eje abrevia: un saldo de ocho cifras completo se come el ancho del gráfico. La cifra
// exacta está en la tabla de abajo y en el tooltip, que es lo que exige la Regla del Gráfico.
const compact = (value: number, currency: string): string => {
  const symbol = SYMBOL[currency] ?? ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)} M`
  if (abs >= 1_000) return `${symbol}${Math.round(value / 1_000)} k`
  return `${symbol}${Math.round(value)}`
}

export const BalanceChart = ({ installments }: Props) => {
  if (installments.length === 0) return null

  const currency = installments[0]?.balance.currency ?? 'CRC'
  const data = installments.map((installment) => ({
    month: formatIsoMonth(installment.dueDate),
    balance: Number(installment.balance.minorUnits) / 100,
  }))

  return (
    <ChartContainer
      config={config}
      className="h-48 w-full"
      role="img"
      aria-label={copy.schedule.chartLabel}
    >
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={40} fontSize={11} />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(value: number) => compact(value, currency)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="balance"
          type="monotone"
          stroke="var(--color-balance)"
          fill="var(--color-balance)"
          fillOpacity={0.12}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
