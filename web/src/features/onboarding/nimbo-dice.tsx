import type { ReactNode } from 'react'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'

interface Props {
  gesto: NombreDeGesto
  id: string
  children: ReactNode
}

// Nimbo a la izquierda y lo que dice en una burbuja. En el teléfono va arriba, para dejarle el
// ancho al texto. La cara no dice nada que la burbuja no diga, así que para el lector de
// pantalla no existe.
export const NimboDice = ({ gesto, id, children }: Props) => (
  <div className="flex flex-col items-center gap-3 sm:flex-row">
    <div aria-hidden="true" className="w-16 shrink-0">
      <Bloub gesto={gesto} className="h-auto w-full" />
    </div>
    <p id={id} className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
      {children}
    </p>
  </div>
)
