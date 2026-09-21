import { createFileRoute } from '@tanstack/react-router'
import { CirclePlus, PenLine, ScrollText, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Card } from '@/components/ui/card'
import { copy } from '@/features/shell/copy'
import { releases, type Release } from '@/features/shell/release-notes'
import { formatLongDate } from '@/lib/dates'

interface GroupProps {
  label: string
  icon: LucideIcon
  lines: string[]
}

// El rótulo a la izquierda y las líneas a la derecha: así se puede saltar directo a lo
// corregido sin leer lo nuevo. Bajo sm la columna se apila, porque siete caracteres de
// ancho para «Corregido» dejarían el texto en dos palabras por renglón.
const Group = ({ label, icon: Icon, lines }: GroupProps) =>
  lines.length === 0 ? null : (
    <div className="grid gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr]">
      <h3 className="flex items-center gap-1.5 text-xs text-muted-foreground sm:pt-0.5">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </h3>
      <ul className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
        {lines.map((line) => (
          <li key={line} className="text-sm">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )

const ReleaseBlock = ({ release }: { release: Release }) => (
  <Card size="sm" className="gap-0 px-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
        <ScrollText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {formatLongDate(release.date)}
      </h2>

      <span className="flex items-baseline gap-3 text-xs text-muted-foreground">
        {/* La marca es texto y no un punto de color: sin versiones publicadas nunca aparece,
            y cuando aparezca tiene que decir qué significa sin depender del tono. */}
        {release.version === __APP_VERSION__ ? <span>{copy.releases.current}</span> : null}
        {release.version ? <span className="num">v{release.version}</span> : null}
      </span>
    </div>

    <div className="mt-3 divide-y divide-border border-t border-border pt-1">
      <Group label={copy.releases.added} icon={CirclePlus} lines={release.added} />
      <Group label={copy.releases.improved} icon={PenLine} lines={release.improved} />
      <Group label={copy.releases.fixed} icon={Wrench} lines={release.fixed} />
    </div>
  </Card>
)

const ReleasesScreen = () => (
  <section className="space-y-6">
    <header className="max-w-[65ch]">
      <h1 className="text-xl font-semibold tracking-tight">{copy.releases.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{copy.releases.description}</p>
    </header>

    {releases.length === 0 ? (
      <EmptyState title={copy.releases.empty.title} description={copy.releases.empty.description} />
    ) : (
      <div className="space-y-3">
        {releases.map((release) => (
          <ReleaseBlock key={release.date} release={release} />
        ))}
      </div>
    )}
  </section>
)

export const Route = createFileRoute('/novedades')({ component: ReleasesScreen })
