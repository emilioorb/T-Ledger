import { copy } from '@/features/shell/copy'

// Saber qué versión estás viendo es la diferencia entre «no cuadra» y «no cuadra todavía»:
// cuando un número se ve raro, lo primero es descartar que sea una versión vieja en caché.
export const AppFooter = () => (
  <footer className="flex h-9 shrink-0 items-center justify-center gap-2 border-t border-border px-4 text-xs text-muted-foreground">
    <span className="text-foreground">{copy.app.name}</span>
    <span aria-hidden="true">·</span>
    <span>
      © <span className="num">{__BUILD_YEAR__}</span> {copy.app.author}
    </span>
    <span aria-hidden="true">·</span>
    <span className="num">v{__APP_VERSION__}</span>
  </footer>
)
