import type { ReactNode } from 'react'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'

interface Props {
  gesto: NombreDeGesto
  id: string
  children: ReactNode
}

// Nimbo a la izquierda y lo que dice en una burbuja con la punta hacia él. En el teléfono va
// arriba y más chico, para dejarle el ancho al texto. La cara no dice nada que la burbuja no
// diga, así que para el lector de pantalla no existe.
export const NimboDice = ({ gesto, id, children }: Props) => (
  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
    <div aria-hidden="true" className="w-16 shrink-0 sm:w-20">
      <Bloub gesto={gesto} className="h-auto w-full" />
    </div>
    <p
      id={id}
      className="relative rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground before:absolute before:top-5 before:-left-1.5 before:hidden before:size-3 before:rotate-45 before:border-b before:border-l before:border-border before:bg-muted sm:before:block"
    >
      {children}
    </p>
  </div>
)
