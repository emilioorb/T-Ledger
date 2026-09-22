import { LibraryIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { organization } from '@/features/identity/auth-client'
import { copy } from './copy'

// El identificador legible que pide Better Auth. Sale del nombre porque pedirlo aparte sería
// preguntar por algo que a nadie le importa: lo único que se ve del libro es su nombre.
const apodoDe = (nombre: string): string =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || `libro-${Date.now()}`

// Crear un libro nuevo. El tope de tres lo hace cumplir el servidor; acá el botón se apaga
// antes para no ofrecer una puerta que va a contestar que no.
export const CrearLibro = ({ lleno }: { lleno: boolean }) => {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [creando, setCreando] = useState(false)

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (!abrir) setNombre('')
  }

  const crear = async (evento: FormEvent) => {
    evento.preventDefault()
    const limpio = nombre.trim()
    if (limpio === '') return

    setCreando(true)
    const { data, error } = await organization.create({ name: limpio, slug: apodoDe(limpio) })

    if (error || !data) {
      setCreando(false)
      return toast.error(copy.libros.createFailed)
    }

    // Entrar al libro recién creado es parte de crearlo: quedarse en el anterior obligaría a
    // buscarlo en la lista para usar lo que uno acaba de hacer.
    await organization.setActive({ organizationId: data.id })
    toast.success(copy.libros.created(limpio))
    // La recarga entera, igual que al cambiar de libro: en memoria quedan los saldos y los
    // movimientos del anterior.
    window.location.assign('/')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={lleno}
          onClick={() => cerrar(true)}
        >
          {copy.libros.create}
        </Button>

        {lleno ? <p className="text-xs text-muted-foreground">{copy.libros.full}</p> : null}
      </div>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.libros.createTitle}
        description={copy.libros.createHint}
        icon={LibraryIcon}
      >
        <form onSubmit={crear} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre-libro-nuevo">{copy.libros.name}</Label>
            <Input
              id="nombre-libro-nuevo"
              autoFocus
              required
              placeholder={copy.libros.namePlaceholder}
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => cerrar(false)}>
              {copy.contrasena.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={creando || nombre.trim() === ''}>
              {creando ? copy.libros.submitting : copy.libros.submit}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  )
}
