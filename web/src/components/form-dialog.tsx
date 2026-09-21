import type { ReactNode } from 'react'
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
  children: ReactNode
  onOpenChange: (open: boolean) => void
}

// Un formulario de dos o tres campos no merece empujar la lista media pantalla para abajo:
// se pide, se llena y se vuelve. Los que sí llevan muchos campos siguen en la pantalla,
// porque un modal de doce campos es una pantalla con menos aire y sin dónde apoyarse.
export const FormDialog = ({ open, title, description, children, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
)
