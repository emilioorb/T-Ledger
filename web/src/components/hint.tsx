import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  text: string
  children: ReactNode
}

// El `title` nativo no se alcanza por toque ni por teclado, y el toque es el contexto
// principal del producto. La explicación se subraya de puntos para que se note que hay algo.
export const Hint = ({ text, children }: Props) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help underline decoration-dotted decoration-from-font underline-offset-4">
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>
)
