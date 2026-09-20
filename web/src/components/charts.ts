// Único punto del proyecto que toca Recharts. Todo gráfico importa de acá, de modo que
// ninguno pueda saltarse el envoltorio de shadcn, que es lo que aporta los tokens del
// tema y el tooltip accesible. El envoltorio no reexporta las primitivas por su cuenta.
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

export { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
