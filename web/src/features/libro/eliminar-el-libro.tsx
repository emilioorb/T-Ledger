import { BookXIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Seccion } from '@/features/cuenta/seccion'
import { CampoDeContrasena } from '@/features/identity/campo-de-contrasena'
import { copy } from './copy'
import { useBorrarLibro } from './use-libro'

interface Props {
  nombre: string
  // El último libro no se borra: sin ninguno, la cuenta queda adentro y sin poder hacer nada.
  // El servidor lo rechaza igual; acá el botón se apaga antes y dice por qué.
  unico: boolean
}

// Pide la contraseña por lo mismo que vaciar, y con más razón: esto no deja ni el registro.
export const EliminarElLibro = ({ nombre, unico }: Props) => {
  const [abierto, setAbierto] = useState(false)
  const [contrasena, setContrasena] = useState('')
  const borrar = useBorrarLibro(nombre)

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (!abrir) setContrasena('')
  }

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (contrasena === '') return
    borrar.mutate(contrasena)
  }

  return (
    <Seccion title={copy.borrar.title} hint={copy.borrar.hint} icon={BookXIcon}>
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={unico}
          onClick={() => cerrar(true)}
        >
          {copy.borrar.open}
        </Button>
        {unico ? <p className="text-xs text-muted-foreground">{copy.borrar.lastBook}</p> : null}
      </div>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.borrar.dialogTitle}
        description={copy.borrar.dialogHint}
        icon={BookXIcon}
      >
        <form onSubmit={confirmar} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="confirmacion-borrar">{copy.borrar.confirmLabel(nombre)}</Label>
            <CampoDeContrasena
              id="confirmacion-borrar"
              autoComplete="current-password"
              value={contrasena}
              onChange={setContrasena}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => cerrar(false)}>
              {copy.borrar.cancel}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={borrar.isPending || contrasena === ''}
            >
              {borrar.isPending ? copy.borrar.deleting : copy.borrar.confirm}
            </Button>
          </div>
        </form>
      </FormDialog>
    </Seccion>
  )
}
