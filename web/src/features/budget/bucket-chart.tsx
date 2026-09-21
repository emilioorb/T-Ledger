import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/charts'
import { copy } from './copy'
import type { BucketEvaluation } from './types'

interface Props {
  buckets: readonly BucketEvaluation[]
}

// Dos series, distinguidas por luminancia, no tres barras de colores iguales: lo asignado
// es el marco y lo consumido es el dato. Las cifras exactas van en la tabla de abajo.
const config = {
  allocated: { label: copy.budget.columns.allocated, color: 'var(--chart-2)' },
  consumed: { label: copy.budget.columns.consumed, color: 'var(--chart-1)' },
} satisfies ChartConfig

const toMajor = (minorUnits: string): number => Number(minorUnits) / 100

export const BucketChart = ({ buckets }: Props) => {
  const data = buckets.map((bucket) => ({
    name: bucket.name,
    allocated: toMajor(bucket.allocated.minorUnits),
    consumed: toMajor(bucket.consumed.minorUnits),
  }))

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="allocated" fill="var(--color-allocated)" radius={2} />
        <Bar dataKey="consumed" fill="var(--color-consumed)" radius={2} />
      </BarChart>
    </ChartContainer>
  )
}
