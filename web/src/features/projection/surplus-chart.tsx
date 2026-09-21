import {
  Area,
  AreaChart,
  CartesianGrid,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ReferenceLine,
  XAxis,
  YAxis,
} from '@/components/charts'
import { formatIsoMonth } from '@/lib/dates'
import { copy } from './overview-copy'
import type { MonthlyFlow } from './types'

const SYMBOL: Record<string, string> = { CRC: '₡', USD: '$' }

// El eje abrevia: un excedente de siete cifras completo se come el ancho. La cifra exacta
// vive en el tooltip y en la tabla de Proyección.
const compact = (value: number, currency: string): string => {
  const symbol = SYMBOL[currency] ?? ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${symbol}${Math.round(value / 1_000)}k`
  return `${symbol}${Math.round(value)}`
}

const config = { surplus: { label: copy.overview.chart.surplus, color: 'var(--chart-1)' } }

// La línea del cero no es decoración: es la frontera entre un mes que cierra y uno que no,
// y sin ella un excedente negativo se lee como «poco» en vez de como «falta».
export const SurplusChart = ({ flows }: { flows: MonthlyFlow[] }) => {
  if (flows.length === 0) return null

  const currency = flows[0]?.surplus.currency ?? 'CRC'
  const data = flows.map((flow) => ({
    month: formatIsoMonth(`${flow.year}-${String(flow.month).padStart(2, '0')}`),
    surplus: Number(flow.surplus.minorUnits) / 100,
  }))

  return (
    <ChartContainer
      config={config}
      className="h-56 w-full"
      role="img"
      aria-label={copy.overview.chart.projection}
    >
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={32} fontSize={11} />
        <YAxis
          width={60}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(value: number) => compact(value, currency)}
        />
        <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="surplus"
          type="monotone"
          stroke="var(--color-surplus)"
          fill="var(--color-surplus)"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
