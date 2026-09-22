import { createFileRoute } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import { EmptyState } from '@/components/empty-state'
import { Card } from '@/components/ui/card'
import { copy } from '@/features/shell/copy'
import { Brote, Chispas, Fiesta, Llave } from '@/features/shell/ilustraciones'
import { releases, type Release } from '@/features/shell/release-notes'
import { TextoMarkdown } from '@/features/shell/texto-markdown'
import { formatLongDate } from '@/lib/dates'

interface GrupoProps {
  label: string
  icon: ComponentType<{ className?: string }>
  cuerpo: string
}

// Un rótulo con su dibujo y sus líneas debajo.
//
// Antes esto eran dos columnas de texto largo: la vista saltaba de izquierda a derecha en
// cada renglón, las filas quedaban desparejas porque unas frases ocupan una línea y otras
// dos, y el texto llegaba a ciento veinte caracteres de ancho. Una columna sola se lee de
// corrido.
const Grupo = ({ label, icon: Icono, cuerpo }: GrupoProps) =>
  cuerpo === '' ? null : (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {/* Cinco y no cuatro: son dibujos con trazo, y a dieciséis píxeles el brote y la
            llave se convertían en una mancha. */}
        <Icono className="size-5 shrink-0" />
        {label}
      </h3>

      <div className="mt-2.5 space-y-2">
        <TextoMarkdown>{cuerpo}</TextoMarkdown>
      </div>
    </div>
  )

// Cada entrega abre con su fecha y sigue con lo que cambió.
//
// Sin tarjeta. Una tarjeta agrupa cosas que de otro modo se confundirían, y acá lo que separa
// una entrega de la siguiente es el tiempo: alcanza una regla. Sacarlas quitó dos bordes, dos
// fondos y el relleno de cada bloque, que era casi todo el ruido de la pantalla.
const Entrega = ({ release }: { release: Release }) => (
  <article className="border-t border-border py-10 first:border-t-0 first:pt-0">
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="text-sm font-medium tracking-tight">{formatLongDate(release.date)}</h2>

      {/* La versión en una píldora, como la marca que es: dice a qué build corresponde lo de
          abajo, no es parte de la frase de la fecha. */}
      {release.version ? (
        <span className="num rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          v{release.version}
        </span>
      ) : null}

      {/* Texto y no un punto de color: tiene que decir qué significa sin depender del tono. */}
      {release.version === __APP_VERSION__ ? (
        <span className="text-xs text-muted-foreground">{copy.releases.current}</span>
      ) : null}
    </header>

    <div className="mt-5 space-y-7">
      <Grupo label={copy.releases.added} icon={Chispas} cuerpo={release.grupos.added} />
      <Grupo label={copy.releases.improved} icon={Brote} cuerpo={release.grupos.improved} />
      <Grupo label={copy.releases.fixed} icon={Llave} cuerpo={release.grupos.fixed} />
    </div>
  </article>
)

// Una columna centrada y angosta, como se lee un texto. Es la excepción a la densidad del
// resto del producto y está bien que lo sea: las demás pantallas muestran cifras que se
// escanean, y esta es lo único que se lee de corrido.
const ReleasesScreen = () => (
  <Card className="mx-auto max-w-2xl gap-10 px-6 py-8 sm:px-8">
    <header className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{copy.releases.title}</h1>
        <p className="mt-2 max-w-[55ch] text-sm text-muted-foreground">
          {copy.releases.description}
        </p>
      </div>

      {/* El dibujo grande acompaña al título y no se repite en cada entrega: una ilustración
          por pantalla es una decisión, una por bloque es decoración. */}
      <Fiesta className="hidden w-24 shrink-0 sm:block" />
    </header>

    {releases.length === 0 ? (
      <EmptyState title={copy.releases.empty.title} description={copy.releases.empty.description} />
    ) : (
      <div>
        {releases.map((release) => (
          <Entrega key={release.date} release={release} />
        ))}
      </div>
    )}
  </Card>
)

export const Route = createFileRoute('/novedades')({ component: ReleasesScreen })
