import { cn } from '@/lib/utils'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'
import { TextoMarkdown } from '@/features/shell/texto-markdown'
import { ENTRADA } from './entrada'

interface Props {
  gesto: NombreDeGesto
  id: string
  children: string
}

// Nimbo al lado de lo que dice, en todos los anchos: arriba y centrado empujaba los campos fuera
// de la pantalla del teléfono. La cara no dice nada que la burbuja no diga, así que para el
// lector de pantalla no existe. La burbuja lleva `key` y la cara no: cambia el texto, pero Nimbo
// sigue siendo el mismo y parpadea al cambiar de gesto.
//
// La burbuja es un `div` y no un `p`: lo que dice se escribe en Markdown (negrita, cursiva) y
// `TextoMarkdown` en modo `enLinea` ya devuelve el texto sin envolverlo en su propio párrafo,
// pero un `div` evita depender de ese detalle para no anidar un `<p>` dentro de otro.
export const NimboDice = ({ gesto, id, children }: Props) => (
  <div className="flex items-start gap-3">
    <div aria-hidden="true" className="w-10 shrink-0 sm:w-14">
      <Bloub gesto={gesto} className="h-auto w-full" />
    </div>
    <div key={id} id={id} className={cn('rounded-lg bg-secondary px-3 py-2 text-sm text-pretty text-text-secondary', ENTRADA)}>
      <TextoMarkdown enLinea>{children}</TextoMarkdown>
    </div>
  </div>
)
