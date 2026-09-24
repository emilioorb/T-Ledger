import * as React from "react"
import { cn } from "cn"

// En iOS, WebKit dibuja el campo de fecha como inline-flex y lo mide por su propio contenido:
// ignora el w-full y se sale del modal. `appearance-none` lo saca de ese tamaño nativo, y el
// valor interno se alinea a la izquierda como en los demás campos.
// https://gomakethings.com/articles/fixing-temporal-input-styling-in-safari/
const FECHA_EN_IOS = "[&[type=date]]:appearance-none [&[type=date]::-webkit-date-and-time-value]:text-left"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        FECHA_EN_IOS,
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--duration-press) ease-(--ease-out-quart) outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
