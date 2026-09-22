import { CopyIcon, UserPlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
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
import { copy } from './copy'
import { useInvitar, type RolDelLibro } from './use-libro'

const ROLES: RolDelLibro[] = ['editor', 'viewer', 'owner']

// El enlace que hay que pasarle a la persona. Se arma con el origen de esta pantalla y no con
// una variable de entorno: la invitación se abre donde vive la aplicación, y ese dato ya está
// en el navegador que la está creando.
const enlaceDe = (invitationId: string) =>
  `${window.location.origin}/crear-cuenta?invitacion=${invitationId}`

export const Invitar = () => {
  const [abierto, setAbierto] = useState(false)
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState<RolDelLibro>('editor')
  const [enlace, setEnlace] = useState<string | null>(null)
  const invitar = useInvitar()

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
      { onSuccess: (invitacion) => invitacion && setEnlace(enlaceDe(invitacion.id)) },
    )
  }

  const copiar = async () => {
    if (!enlace) return
    await navigator.clipboard.writeText(enlace)
    toast.success(copy.invitar.copied)
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
            <div className="space-y-1.5">
              <Label htmlFor="enlace">{copy.invitar.linkLabel}</Label>
              <Input id="enlace" readOnly value={enlace} className="num text-xs" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void copiar()}>
                <CopyIcon aria-hidden="true" />
                {copy.invitar.copy}
              </Button>
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
              <Button type="submit" size="sm" disabled={invitar.isPending || correo.trim() === ''}>
                {invitar.isPending ? copy.invitar.submitting : copy.invitar.submit}
              </Button>
            </div>
          </form>
        )}
      </FormDialog>
    </>
  )
}
