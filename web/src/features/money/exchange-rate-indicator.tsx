import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatIsoDate } from '@/lib/dates'
import { copy } from './copy'
import { useLatestRates } from './use-exchange-rates'

const Par = ({ label, value }: { label: string; value: string }) => (
  <span className="whitespace-nowrap">
    <span className="text-muted-foreground">{label} </span>
    <span className="num font-medium">{value}</span>
  </span>
)

// Va en la cabecera, no en una tarjeta de métrica: la fila de tarjetas está prohibida.
export const ExchangeRateIndicator = () => {
  const { data, isPending } = useLatestRates()

  if (isPending) {
    return <Skeleton className="h-5 w-44" aria-label={copy.loading} />
  }

  if (!data || (!data.buy && !data.sell)) {
    return <span className="text-xs text-muted-foreground">{copy.empty}</span>
  }

  return (
    <div className="flex items-baseline gap-3 text-xs">
      <span className="hidden text-muted-foreground sm:inline">{copy.title}</span>
      {data.buy ? <Par label={copy.buy} value={data.buy.value} /> : null}
      {data.sell ? <Par label={copy.sell} value={data.sell.value} /> : null}

      {data.stale ? (
        // Advertencia, no error: el sistema funciona, el dato es el que está viejo.
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="border-warning text-warning">
              {copy.stale}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{copy.staleHint}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="num hidden text-muted-foreground md:inline">
          {copy.publishedAt(formatIsoDate(data.buy?.publishedAt ?? data.sell?.publishedAt ?? ''))}
        </span>
      )}
    </div>
  )
}
