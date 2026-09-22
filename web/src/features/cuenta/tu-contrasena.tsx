import { KeyRoundIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { auth } from '@/features/identity/auth-client'
import { CampoDeContrasena } from '@/features/identity/campo-de-contrasena'
import { copy } from './copy'

// Lo mismo que pide Better Auth para registrarse. Comprobarlo acá es para decirlo antes de
// mandar, no para reemplazar la validación del servidor: eso se comprueba donde no se puede
// saltar.
const MINIMO = 8

// En un modal y no en la pantalla: cambiar la contraseña se hace una vez por año, y tres
// campos de contraseña siempre abiertos ocupan un tercio del perfil para algo que casi nunca
// se toca. Se pide, se llena y se vuelve.
export const TuContrasena = () => {
  const [abierto, setAbierto] = useState(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [cambiando, setCambiando] = useState(false)

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (abrir) return
    // Nada de contraseñas a medio escribir esperando a la próxima vez que se abra.
    setActual('')
    setNueva('')
    setRepetida('')
  }

  const cambiar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (nueva.length < MINIMO) return toast.error(copy.contrasena.short)
    if (nueva !== repetida) return toast.error(copy.contrasena.mismatch)

    setCambiando(true)
    await auth.changePassword(
      {
        currentPassword: actual,
        newPassword: nueva,
        // Cambiar la contraseña por sospecha y dejar abiertas las demás sesiones sería la
        // mitad del gesto: quien hubiera entrado con la vieja sigue adentro.
        revokeOtherSessions: true,
      },
      {
        onSuccess: () => {
          toast.success(copy.contrasena.changed)
          cerrar(false)
        },
        // El 400 de Better Auth acá significa una sola cosa: la actual no era esa. Se
        // distingue del resto porque es lo único que la persona puede corregir.
        onError: ({ error }) => {
          toast.error(error.status === 400 ? copy.contrasena.wrong : copy.contrasena.failed)
        },
      },
    )
    setCambiando(false)
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => cerrar(true)}>
        {copy.contrasena.open}
      </Button>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.contrasena.open}
        description={copy.contrasena.dialogHint}
        icon={KeyRoundIcon}
      >
        <form onSubmit={cambiar} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="actual">{copy.contrasena.current}</Label>
            <CampoDeContrasena
              id="actual"
              autoComplete="current-password"
              value={actual}
              onChange={setActual}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nueva">{copy.contrasena.next}</Label>
            <CampoDeContrasena
              id="nueva"
              autoComplete="new-password"
              value={nueva}
              onChange={setNueva}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="repetida">{copy.contrasena.repeat}</Label>
            <CampoDeContrasena
              id="repetida"
              autoComplete="new-password"
              value={repetida}
              onChange={setRepetida}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => cerrar(false)}>
              {copy.contrasena.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={cambiando || actual === '' || nueva === ''}>
              {cambiando ? copy.contrasena.submitting : copy.contrasena.submit}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  )
}
