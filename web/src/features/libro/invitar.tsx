import { UserPlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { enlaceAlLibro } from '@/features/datos/enlace-de-invitacion'
import { copy } from './copy'
import { EnlaceDeLaInvitacion } from './enlace-de-la-invitacion'
import { useEnlaceDeInvitacion, useInvitar, type RolDelLibro } from './use-libro'

const ROLES: RolDelLibro[] = ['editor', 'viewer', 'owner']

export const Invitar = () => {
  const [abierto, setAbierto] = useState(false)
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState<RolDelLibro>('editor')
  const [enlace, setEnlace] = useState<string | null>(null)
  const invitar = useInvitar()
  const sacarEnlace = useEnlaceDeInvitacion()
  const enviando = invitar.isPending || sacarEnlace.isPending

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (abrir) return
    setCorreo('')
    setRol('editor')
    setEnlace(null)
  }

  const crear = (evento: FormEvent) => {
    evento.preventDefault()
    invitar.mutate(
      { email: correo.trim(), role: rol },
      {
        onSuccess: (invitacion) =>
          invitacion &&
          sacarEnlace.mutate(invitacion.id, {
            onSuccess: ({ token }) => setEnlace(enlaceAlLibro(window.location.origin, invitacion.id, token)),
            // La invitación ya quedó creada: reenviar el formulario chocaría con ella. El aviso
            // manda a sacar el enlace desde la lista.
            onError: () => cerrar(false),
          }),
      },
    )
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => cerrar(true)}>
        {copy.invitar.open}
      </Button>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.invitar.title}
        description={copy.invitar.hint}
        icon={UserPlusIcon}
      >
        {/* Dos pasos en el mismo modal: crear la invitación y llevarse el enlace. Cerrarlo y
            volver a abrir para buscar el enlace sería perder lo único que la invitación
            produce, porque todavía no hay correo que lo mande. */}
        {enlace ? (
          <div className="grid gap-3">
            <EnlaceDeLaInvitacion id="enlace" enlace={enlace} />

            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={() => cerrar(false)}>
                {copy.invitar.close}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={crear} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="correo-invitado">{copy.invitar.email}</Label>
              <Input
                id="correo-invitado"
                type="email"
                required
                autoFocus
                placeholder={copy.invitar.emailPlaceholder}
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rol-invitado">{copy.invitar.role}</Label>
              <Select value={rol} onValueChange={(valor) => setRol(valor as RolDelLibro)}>
                <SelectTrigger id="rol-invitado" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {copy.gente.roles[opcion].name} · {copy.gente.roles[opcion].hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2 flex justify-end">
              <Button type="submit" size="sm" disabled={enviando || correo.trim() === ''}>
                {enviando ? copy.invitar.submitting : copy.invitar.submit}
              </Button>
            </div>
          </form>
        )}
      </FormDialog>
    </>
  )
}
