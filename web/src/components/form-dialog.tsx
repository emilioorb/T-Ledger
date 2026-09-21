import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  title: string
  description?: string
  className?: string
  icon?: LucideIcon
  children: ReactNode
  onOpenChange: (open: boolean) => void
}

// Un formulario de dos o tres campos no merece empujar la lista media pantalla para abajo:
// se pide, se llena y se vuelve. Los que sí llevan muchos campos siguen en la pantalla,
// porque un modal de doce campos es una pantalla con menos aire y sin dónde apoyarse.
export const FormDialog = ({
  open,
  title,
  description,
  className,
  icon: Icon,
  children,
  onOpenChange,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={className}>
      <DialogHeader>
        {/* El icono nombra de qué es el formulario antes de leer el título: en un modal no
            hay miga ni barra lateral que lo sitúen. */}
        <DialogTitle className="flex items-center gap-2">
          {Icon ? (
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : null}
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
)
