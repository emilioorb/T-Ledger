import { CheckIcon, ShuffleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Los diez colores del sistema, por número. Viven acá y no en cada pantalla porque las cubetas
// del presupuesto y las categorías eligen de la misma fila: dos listas paralelas se
// desincronizan la primera vez que alguien agregue un color.
export const COLORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export type ColorIndex = (typeof COLORES)[number]

// El color que le toca a algo que no eligió ninguno. Se reparte por posición, así que dos
// cosas seguidas nunca salen del mismo color.
export const colorPorPosicion = (posicion: number): ColorIndex =>
  COLORES[posicion % COLORES.length] ?? 1

// El valor CSS y no una clase de Tailwind. Tailwind genera sus utilidades escaneando el
// código, así que una clase armada en tiempo de ejecución —`bg-bucket-${n}`— nunca existe:
// medido, el punto quedaba pintado de `rgba(0, 0, 0, 0)`. La variable, en cambio, está
// siempre, y se redefine sola al cambiar de tema.
export const colorDe = (indice: number | null | undefined, posicion = 0): string =>
  `var(--bucket-${indice ?? colorPorPosicion(posicion)})`

interface Props {
  value: number | null
  onChange: (color: number | null) => void
  label: string
  // Para el caso «que elija el sistema», que es distinto de no haber elegido nunca.
  autoLabel: string
  // Con qué se pintan las fichas. Por defecto los colores del tema, que son los que llevan
  // las cubetas y las categorías; la mascota pasa los suyos, que no cambian con el tema.
  colorDeLaFicha?: (indice: number) => string
  className?: string
}

// Diez fichas y una opción para devolver la decisión al sistema. No hay un selector de color
// libre a propósito: cada uno de estos diez tiene su versión para tema claro y para oscuro, y
// un hex suelto se vería bien en uno y desaparecería en el otro.
export const ColorPicker = ({
  value,
  onChange,
  label,
  autoLabel,
  colorDeLaFicha = colorDe,
  className,
}: Props) => (
  <div className={cn('space-y-2', className)}>
    <p className="text-sm font-medium">{label}</p>

    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {COLORES.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={`${label} ${color}`}
          onClick={() => onChange(color)}
          style={{ backgroundColor: colorDeLaFicha(color) }}
          className={cn(
            'grid size-7 place-items-center rounded-full transition-[transform,box-shadow] duration-(--duration-press) ease-(--ease-out-quart)',
            'active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            // El anillo va por fuera y del color del fondo, para que se lea como un halo y no
            // como un borde que cambia el tamaño de la ficha.
            value === color && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
          )}
        >
          {/* Tinta oscura fija y no `text-background`: las fichas son claras en los dos temas,
              así que en tema claro el tilde quedaba casi blanco sobre color y se medía en
              2,40–2,84:1. Con `--ink-on-bucket` da 5,97–9,00:1 en los dos. */}
          {value === color ? (
            <CheckIcon className="size-3.5 text-ink-on-bucket" aria-hidden="true" />
          ) : null}
        </button>
      ))}

      {/* Misma ficha redonda que las diez de color: una píldora con texto al final de la fila
          rompía la forma y se leía como otra cosa. El nombre viaja en `aria-label` y en el
          `title`, que es lo que ve quien no reconozca el ícono. */}
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label={autoLabel}
        title={autoLabel}
        onClick={() => onChange(null)}
        className={cn(
          'grid size-7 place-items-center rounded-full border border-dashed border-border-strong text-muted-foreground',
          'transition-[transform,color,border-color] duration-(--duration-press) ease-(--ease-out-quart)',
          'active:translate-y-px hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          value === null && 'border-solid border-foreground text-foreground',
        )}
      >
        <ShuffleIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  </div>
)

// El punto que identifica algo en una lista. Va con su nombre al lado siempre: el color ordena,
// no informa, y quien no lo distinga tiene que poder leer igual.
export const PuntoDeColor = ({
  colorIndex,
  posicion = 0,
  className,
}: {
  colorIndex: number | null | undefined
  posicion?: number
  className?: string
}) => (
  <span
    aria-hidden="true"
    style={{ backgroundColor: colorDe(colorIndex, posicion) }}
    className={cn('inline-block size-2.5 shrink-0 rounded-full', className)}
  />
)
