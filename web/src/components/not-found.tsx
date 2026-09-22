import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { copy } from '@/features/shell/copy'

// Una ruta que no existe no es un error del servidor ni una pantalla vacía: es un desvío.
// Se dice en el mismo idioma que el resto y se ofrece el camino de vuelta.
export const NotFound = () => (
  <section className="max-w-[60ch] space-y-3">
    <h1 className="text-xl font-semibold tracking-tight">{copy.notFound.title}</h1>
    <p className="text-sm text-muted-foreground">{copy.notFound.description}</p>
    <Button size="sm" asChild>
      <Link to="/tablero">{copy.notFound.action}</Link>
    </Button>
  </section>
)
