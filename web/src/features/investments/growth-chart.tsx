import {
  Area,
  AreaChart,
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/charts'
import { formatIsoMonth } from '@/lib/dates'
import { copy } from './copy'

export interface GrowthPoint {
  month: string
  value: number
  invested: number
}

interface Props {
  points: GrowthPoint[]
}

// Dos series distinguidas por luminancia, no por color: el capital puesto es el piso (punteado)
// y el valor es lo que crece encima. El eje arranca en el mínimo de los datos: contra cero, un
// 6,5% anual se vería como una línea recta.
const config = {
  value: { label: copy.investments.columns.value, color: 'var(--chart-1)' },
  invested: { label: copy.investments.columns.invested, color: 'var(--chart-3)' },
} satisfies ChartConfig

export const GrowthChart = ({ points }: Props) => (
  <ChartContainer config={config} className="mt-3 h-56 w-full">
    <AreaChart data={points} margin={{ left: 4, right: 4, top: 4 }}>
      <CartesianGrid vertical={false} strokeDasharray="2 4" />
      <XAxis
        dataKey="month"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        fontSize={11}
        minTickGap={24}
        tickFormatter={(month: string) => formatIsoMonth(`${month}-01`)}
      />
      <YAxis hide domain={['dataMin', 'dataMax']} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
      <Area
        dataKey="invested"
        stroke="var(--color-invested)"
        fill="var(--color-invested)"
        fillOpacity={0.08}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <Area
        dataKey="value"
        stroke="var(--color-value)"
        fill="var(--color-value)"
        fillOpacity={0.12}
        strokeWidth={2}
      />
    </AreaChart>
  </ChartContainer>
)
