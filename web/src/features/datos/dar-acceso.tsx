import { UserPlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormDialog } from '@/components/form-dialog'
import { ApiError } from '@/lib/api'
import { formatIsoDate } from '@/lib/dates'
import { copy } from './copy'
import { enlaceDeInvitacion } from './enlace-de-invitacion'
import {
  useCancelarInvitacionALaApp,
  useInvitacionesALaApp,
  useInvitarALaApp,
} from './use-datos'

const enlaceDe = (correo: string) => enlaceDeInvitacion(window.location.origin, correo)
const enDia = (iso: string) => formatIsoDate(iso.slice(0, 10))

// Para quien pidió acceso por el «Pedir acceso» de la landing. El admin no crea la cuenta ni ve
// ninguna contraseña: deja una invitación para ese correo y le pasa el enlace. La persona se
// registra sola y arranca con su libro Personal.
//
// Se abre desde el contador de cuentas, que es donde el admin ya está mirando quién tiene
// acceso: un enlace al final de esa frase, en la tinta principal y no en otro color, porque el
// sistema es monocromo (DESIGN.md, la Regla del Monocromo).
export const EnlaceDarAcceso = () => {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="font-medium text-foreground underline underline-offset-2 hover:decoration-2 pointer-coarse:py-1.5"
      >
        {copy.acceso.open}
      </button>
      <FormDialog
        open={abierto}
        onOpenChange={setAbierto}
        title={copy.acceso.title}
        description={copy.acceso.hint}
        icon={UserPlusIcon}
        className="sm:max-w-lg"
      >
        <DarAcceso />
      </FormDialog>
    </>
  )
}

export const DarAcceso = () => {
  const [correo, setCorreo] = useState('')
  const [creada, setCreada] = useState<{ email: string; expiresAt: string } | null>(null)

  const pendientes = useInvitacionesALaApp(true)
  const invitar = useInvitarALaApp()
  const cancelar = useCancelarInvitacionALaApp()

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success(copy.acceso.copied)
    } catch {
      toast.error(copy.acceso.copyFailed)
    }
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const limpio = correo.trim()
    if (limpio === '') return
    invitar.mutate(limpio, {
      onSuccess: (invitacion) => {
        setCreada(invitacion)
        setCorreo('')
      },
      onError: (error) =>
        toast.error(
          error instanceof ApiError && error.status === 409
            ? copy.acceso.alreadyHasAccount
            : copy.acceso.failed,
        ),
    })
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="acceso-correo">{copy.acceso.email}</Label>
          <Input
            id="acceso-correo"
            type="email"
            required
            value={correo}
            placeholder={copy.acceso.placeholder}
            onChange={(evento) => setCorreo(evento.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={invitar.isPending || correo.trim() === ''}>
          {invitar.isPending ? copy.acceso.submitting : copy.acceso.submit}
        </Button>
      </form>

      {creada ? (
        <div className="space-y-1.5 rounded-lg border border-border p-3">
          <Label htmlFor="acceso-enlace">{copy.acceso.linkLabel}</Label>
          <div className="flex gap-2">
            <Input
              id="acceso-enlace"
              readOnly
              value={enlaceDe(creada.email)}
              onFocus={(evento) => evento.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => copiar(enlaceDe(creada.email))}>
              {copy.acceso.copy}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{copy.acceso.linkHint(enDia(creada.expiresAt))}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{copy.acceso.pending}</p>
        {(pendientes.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.acceso.none}</p>
        ) : (
          <ul className="divide-y divide-border">
            {(pendientes.data ?? []).map((invitacion) => (
              <li key={invitacion.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{invitacion.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {copy.acceso.expires(enDia(invitacion.expiresAt))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => copiar(enlaceDe(invitacion.email))}>
                    {copy.acceso.copyShort}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={cancelar.isPending}
                    onClick={() =>
                      cancelar.mutate(invitacion.id, { onSuccess: () => toast.success(copy.acceso.cancelled) })
                    }
                  >
                    {copy.acceso.cancel}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
