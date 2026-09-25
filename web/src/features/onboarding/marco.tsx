import type { ReactNode, RefObject } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { copy } from './copy'
import { Progreso } from './progreso'

interface Props {
  actual: number
  total: number
  titulo: string
  tituloRef: RefObject<HTMLHeadingElement | null>
  describedBy: string
  onFuera: () => void
  children: ReactNode
}

// El contenido del diálogo es un fondo transparente que ocupa la pantalla, y adentro va el
// panel. En el teléfono el panel crece hasta llenarla (`flex-1`); en el escritorio el fondo pasa
// a grilla, `flex-1` deja de valer y el panel queda centrado con un alto que no depende del paso:
// cuadrado sobre el ancho máximo, 576 px. En el teléfono va de borde a borde, sin esquinas.
//
// El tope va en línea porque no hay una utilidad generada que lo diga: sin él, en una pantalla
// baja y ancha (un teléfono acostado, o el escritorio con zoom) el cuadrado medía más que la
// pantalla y el pie quedaba afuera. Con el tope el panel nunca pasa del alto visible y el que se desplaza es el cuerpo.
// En el teléfono no cambia nada: el panel ya mide exactamente eso.
const TOPE = { maxHeight: '100dvh' }
const FONDO = 'flex w-full max-w-full min-h-dvh flex-col bg-transparent p-0 sm:grid sm:items-center'
const PANEL = 'mx-auto flex aspect-square w-full flex-1 flex-col overflow-hidden bg-popover ring-1 ring-foreground/10 sm:max-w-xl sm:rounded-xl'

export const Marco = ({ actual, total, titulo, tituloRef, describedBy, onFuera, children }: Props) => (
  <DialogContent
    aria-describedby={describedBy}
    showCloseButton={false}
    className={FONDO}
    // Al abrir, el foco va al título como en cada cambio de paso, y no a la cruz de cerrar.
    onOpenAutoFocus={(evento) => {
      evento.preventDefault()
      tituloRef.current?.focus()
    }}
    // Tocar el fondo alrededor del panel es tocar afuera, como el overlay que tapa.
    onPointerDown={(evento) => {
      if (evento.target === evento.currentTarget) onFuera()
    }}
  >
    <div className={PANEL} style={TOPE}>
      <DialogHeader className="gap-2 border-b px-4 pt-2 pb-3">
        <div className="flex items-center gap-3">
          <Progreso actual={actual} total={total} />
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="-mr-2 size-11 text-muted-foreground">
              <XIcon />
              <span className="sr-only">{copy.botones.cerrar}</span>
            </Button>
          </DialogClose>
        </div>
        <DialogTitle ref={tituloRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          {titulo}
        </DialogTitle>
      </DialogHeader>
      {children}
    </div>
  </DialogContent>
)
