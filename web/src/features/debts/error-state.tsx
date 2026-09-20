import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copy } from './copy'

interface Props {
  onRetry: () => void
}

// Una consulta que falla no puede caer en el estado vacío: decirle a alguien que no tiene
// deudas cuando el servidor no respondió es informarle algo falso sobre su propio dinero.
export const ErrorState = ({ onRetry }: Props) => (
  <div role="alert" className="border-y border-border py-10">
    <h2 className="text-base font-medium tracking-tight">{copy.error.title}</h2>
    <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{copy.error.description}</p>
    <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
      <RotateCw className="size-4" aria-hidden="true" />
      {copy.error.retry}
    </Button>
  </div>
)
