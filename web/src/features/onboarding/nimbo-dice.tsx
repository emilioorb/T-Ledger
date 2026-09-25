import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'
import { ENTRADA } from './entrada'

interface Props {
  gesto: NombreDeGesto
  id: string
  children: ReactNode
}

// Nimbo al lado de lo que dice, en todos los anchos: arriba y centrado empujaba los campos fuera
// de la pantalla del teléfono. La cara no dice nada que la burbuja no diga, así que para el
// lector de pantalla no existe. La burbuja lleva `key` y la cara no: cambia el texto, pero Nimbo
// sigue siendo el mismo y parpadea al cambiar de gesto.
export const NimboDice = ({ gesto, id, children }: Props) => (
  <div className="flex items-start gap-3">
    <div aria-hidden="true" className="w-10 shrink-0">
      <Bloub gesto={gesto} className="h-auto w-full" />
    </div>
    <p key={id} id={id} className={cn('rounded-lg bg-secondary px-3 py-2 text-sm text-pretty text-muted-foreground', ENTRADA)}>
      {children}
    </p>
  </div>
)
