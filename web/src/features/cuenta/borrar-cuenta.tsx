import { UserXIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { auth } from '@/features/identity/auth-client'
import { CampoDeContrasena } from '@/features/identity/campo-de-contrasena'
import { olvidarQuienEra } from '@/lib/observability'
import { copy } from './copy'
import { Seccion } from './seccion'

// Darse de baja. La contraseña no es ceremonia: es lo que distingue a la persona de alguien
// que encontró su sesión abierta, y acá lo que está en juego es la contabilidad entera.
//
// Lo que el diálogo dice con todas las letras es la consecuencia real: el libro del que sos
// el único dueño se borra con vos. Un libro sin dueño no es un libro archivado, es una base
// con la plata de alguien adentro y nadie que pueda entrar, así que la aplicación no lo deja
// existir. Decirlo acá es la diferencia entre una decisión y una sorpresa.
export const BorrarCuenta = () => {
  const [abierto, setAbierto] = useState(false)
  const [contrasena, setContrasena] = useState('')
  const [borrando, setBorrando] = useState(false)

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (!abrir) setContrasena('')
  }

  const borrar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (contrasena === '') return

    setBorrando(true)
    await auth.deleteUser(
      { password: contrasena },
      {
        onSuccess: () => {
          olvidarQuienEra()
          // Recarga completa y no una navegación: la cuenta ya no existe, y lo único seguro
          // después de eso es arrancar de cero sin nada de la persona en memoria.
          window.location.assign('/entrar')
        },
        onError: ({ error }) => {
          toast.error(error.status === 400 ? copy.baja.wrongPassword : copy.baja.failed)
        },
      },
    )
    setBorrando(false)
  }

  return (
    <Seccion title={copy.baja.title} hint={copy.baja.hint} icon={UserXIcon}>
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => cerrar(true)}>
          {copy.baja.open}
        </Button>
      </div>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.baja.dialogTitle}
        description={copy.baja.dialogHint}
        icon={UserXIcon}
      >
        <form onSubmit={borrar} className="grid gap-4">
          <p className="text-xs text-muted-foreground">{copy.baja.export}</p>

          <div className="space-y-1.5">
            <Label htmlFor="baja-contrasena">{copy.baja.password}</Label>
            <CampoDeContrasena
              id="baja-contrasena"
              autoComplete="current-password"
              value={contrasena}
              onChange={setContrasena}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => cerrar(false)}>
              {copy.baja.cancel}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={borrando || contrasena === ''}
            >
              {borrando ? copy.baja.deleting : copy.baja.confirm}
            </Button>
          </div>
        </form>
      </FormDialog>
    </Seccion>
  )
}
