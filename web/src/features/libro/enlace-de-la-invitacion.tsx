import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { enlaceAlLibro } from '@/features/datos/enlace-de-invitacion'
import { copy } from './copy'

export const enlaceDeLaInvitacion = (invitationId: string, token: string) =>
  enlaceAlLibro(window.location.origin, invitationId, token)

// El enlace se ve una sola vez: el token no se guarda, así que perderlo es pedir otro.
export const EnlaceDeLaInvitacion = ({ id, enlace }: { id: string; enlace: string }) => {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace)
      toast.success(copy.invitar.copied)
    } catch {
      toast.error(copy.invitar.copyFailed)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{copy.invitar.linkLabel}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          readOnly
          value={enlace}
          onFocus={(evento) => evento.currentTarget.select()}
          className="num text-xs"
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => void copiar()}>
          <CopyIcon aria-hidden="true" />
          {copy.invitar.copy}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{copy.invitar.linkHint}</p>
    </div>
  )
}
