import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ASIENTOS, totalDe, type Renglon } from './asientos'
import { copy } from './copy'

// Un renglón del asiento: la cuenta a la izquierda y la cifra a la derecha, que es como se
// escribe en un libro y como se lee en el resto del producto.
//
// Se llama `Linea` y no `Renglon` porque `Renglon` ya es el tipo que llega importado, y dos
// declaraciones con el mismo nombre en el mismo módulo no compilan.
const Linea = ({ cuenta, monto }: Renglon) => (
  <span className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
    <span className="truncate">{cuenta}</span>
    <span className="num tabular-nums">{formatMoney(monto)}</span>
  </span>
)

const Rotulo = ({ children, className }: { children: string; className?: string }) => (
  <span className={cn('text-xs tracking-wide text-muted-foreground uppercase', className)}>
    {children}
  </span>
)

// La cuenta T.
//
// La pata es un solo elemento absoluto y no una columna de la grilla: con una celda por fila,
// cualquier separación vertical la deja cortada a pedazos, y una T con la pata a rayas no es
// una T. Así corre entera desde los rótulos hasta la raya de totales.
//
// La glosa cruza las dos columnas porque narra el asiento entero. El debe va a la izquierda y
// el haber a la derecha: si se invierte, la página deja de ser verdad y quien lleva libros lo
// ve antes de leer el titular.
export const CuentaT = ({ className }: { className?: string }) => {
  const total = formatMoney(totalDe(ASIENTOS, 'debe'))

  return (
    <div className={cn('relative mx-auto w-full max-w-3xl', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 hidden w-px bg-border md:block"
      />

      <div className="grid grid-cols-1 gap-x-0 md:grid-cols-2">
        <Rotulo className="hidden pr-8 text-right md:block">{copy.debe}</Rotulo>
        <Rotulo className="hidden pl-8 md:block">{copy.haber}</Rotulo>

        {ASIENTOS.map((asiento) => (
          <div key={asiento.glosa} className="contents">
            <p className="col-span-full pt-6 pb-1.5 text-center text-sm text-muted-foreground">
              «{asiento.glosa}»
            </p>

            {/* En teléfono las dos anotaciones se apilan con un filete a la izquierda: es la
                misma lectura girada noventa grados, porque dos columnas de cuarenta
                caracteres no entran en 320 píxeles. */}
            <p className="border-l border-border pl-3 text-sm md:border-0 md:pr-8 md:pl-0">
              <Linea {...asiento.debe} />
            </p>
            <p className="border-l border-border pl-3 text-sm md:border-0 md:pl-8">
              <Linea {...asiento.haber} />
            </p>
          </div>
        ))}

        {/* La doble raya del cierre: `border-double` es la que usa la contabilidad desde que
            los libros eran de papel, y acá es el remate de la pata. */}
        <p className="mt-6 border-t-[3px] border-double border-border pt-2 text-sm md:pr-8">
          <span className="num tabular-nums block text-right">{total}</span>
        </p>
        <p className="mt-6 border-t-[3px] border-double border-border pt-2 text-sm md:pl-8">
          <span className="num tabular-nums block text-right md:text-left">{total}</span>
        </p>
      </div>
    </div>
  )
}
