import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// Una ruta que no existe no es un error del servidor ni una pantalla vacía: es un desvío.
// Se dice en el mismo idioma que el resto y se ofrece el camino de vuelta.
export const NotFound = () => (
  <section className="max-w-[60ch] space-y-3">
    <h1 className="text-xl font-semibold tracking-tight">Esta dirección no existe</h1>
    <p className="text-sm text-muted-foreground">
      El enlace quedó viejo o tiene un error de tipeo. Nada se perdió: lo registrado sigue donde
      estaba.
    </p>
    <Button size="sm" asChild>
      <Link to="/">Ir al panel</Link>
    </Button>
  </section>
)
