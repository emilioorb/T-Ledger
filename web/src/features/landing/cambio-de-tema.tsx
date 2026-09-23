import { MoonIcon, SunIcon } from 'lucide-react'
import type { Theme } from '@/lib/theme'
import { copy } from './copy'

// El mismo botón flotante de emiliorb.com. De día se ofrece la luna y de noche el sol: el
// ícono es a dónde vas, no dónde estás.
export const CambioDeTema = ({
  tema,
  alCambiar,
}: {
  tema: Theme
  alCambiar: (tema: Theme) => void
}) => {
  const oscuro = tema === 'dark'

  return (
    <button
      type="button"
      aria-pressed={oscuro}
      onClick={() => alCambiar(oscuro ? 'light' : 'dark')}
      className="group fixed right-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 grid size-11 place-items-center sm:right-6"
    >
      <span className="grid size-10 place-items-center rounded-full border border-border bg-background opacity-75 shadow-[0_4px_12px_rgb(0_0_0/0.08)] transition-[opacity,transform] duration-200 ease-out group-hover:opacity-100 group-active:scale-97">
        {/* Los dos, y el CSS muestra el que va: al hidratar la portada `tema` todavía es el del
            prerender, y el ícono tiene que ser el del tema que ya está pintado. */}
        <MoonIcon aria-hidden="true" className="size-4 dark:hidden" strokeWidth={1.8} />
        <SunIcon aria-hidden="true" className="hidden size-4 dark:block" strokeWidth={1.8} />
      </span>
      <span className="sr-only">{oscuro ? copy.tema.claro : copy.tema.oscuro}</span>
    </button>
  )
}
