import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatLongDate } from '@/lib/dates'
import { copy } from './copy'
import { useLatestRates } from './use-exchange-rates'

// En la cabecera compiten cuatro cosas por el mismo renglón: la miga, los atajos y esto. Por
// eso el indicador se reduce a lo único que se mira de reojo —las dos cifras del día— y todo
// lo que las explica vive en el tooltip: qué es cada una, de cuándo es y de dónde salió.
export const ExchangeRateIndicator = () => {
  const { data, isPending } = useLatestRates()

  if (isPending) {
    return <Skeleton className="h-6 w-28" aria-label={copy.loading} />
  }

  if (!data || (!data.buy && !data.sell)) {
    return <span className="text-xs text-muted-foreground">{copy.empty}</span>
  }

  const publishedAt = data.buy?.publishedAt ?? data.sell?.publishedAt ?? ''
  // Las dos cifras en un renglón y la fecha en el suyo: juntas, «· Al» quedaba colgando al
  // final de la línea y la fecha empezaba sola abajo.
  const rates = [
    data.buy ? `${copy.buy} ₡${data.buy.value}` : null,
    data.sell ? `${copy.sell} ₡${data.sell.value}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const when = publishedAt ? copy.publishedAt(formatLongDate(publishedAt)) : ''

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors duration-150 ease-out hover:bg-accent"
          aria-label={`${copy.title}. ${rates}. ${when}`}
        >
          <span className="text-muted-foreground">{copy.unit}</span>
          {data.buy ? <span className="num">{data.buy.value}</span> : null}
          {data.buy && data.sell ? (
            <span className="h-3 w-px shrink-0 bg-border" aria-hidden="true" />
          ) : null}
          {data.sell ? <span className="num text-muted-foreground">{data.sell.value}</span> : null}

          {/* El punto reemplaza a la etiqueta «Sin actualizar»: ocupa lo que ocupa un punto y
              dice lo mismo, porque lo que explica el estado es el tooltip. */}
          {data.stale ? (
            <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
          ) : null}
        </div>
      </TooltipTrigger>
      {/* El tooltip es una fila por defecto: acá son dos párrafos y un pie, así que se
          endereza. La fuente va separada por una línea porque no es parte del dato, es
          de dónde salió. */}
      <TooltipContent
        sideOffset={8}
        collisionPadding={12}
        className="max-w-60 flex-col items-stretch gap-0 px-0 py-0"
      >
        <p className="px-3 py-2">{rates}</p>

        {when ? (
          <p className="border-t border-background/20 px-3 py-1.5 text-center text-background/70">
            {when}
          </p>
        ) : null}

        {data.stale ? (
          <p className="border-t border-background/20 px-3 py-1.5 font-medium">{copy.staleHint}</p>
        ) : null}
        <p className="border-t border-background/20 px-3 py-1.5 text-center text-background/70">
          {copy.source}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
