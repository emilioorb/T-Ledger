import { Trash2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Seccion } from '@/features/cuenta/seccion'
import { CampoDeContrasena } from '@/features/identity/campo-de-contrasena'
import { copy } from './copy'
import { useVaciarLibro } from './use-libro'

// Vaciar pide la contraseña y no un «¿estás seguro?». La diferencia es que lo segundo se
// contesta sin leer —el clic ya está en camino cuando aparece el diálogo— y que la contraseña
// contesta otra pregunta además: que quien está del otro lado es el dueño y no alguien que
// encontró la sesión abierta. El servidor la vuelve a comprobar, que es donde vale.
export const VaciarElLibro = ({ nombre }: { nombre: string }) => {
  const [abierto, setAbierto] = useState(false)
  const [contrasena, setContrasena] = useState('')
  const vaciar = useVaciarLibro()

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (!abrir) setContrasena('')
  }

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (contrasena === '') return
    vaciar.mutate(contrasena, { onSuccess: () => cerrar(false) })
  }

  return (
    <Seccion title={copy.vaciar.title} hint={copy.vaciar.hint} icon={Trash2Icon}>
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => cerrar(true)}>
          {copy.vaciar.open}
        </Button>
      </div>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.vaciar.dialogTitle}
        description={copy.vaciar.dialogHint}
        icon={Trash2Icon}
      >
        <form onSubmit={confirmar} className="grid gap-4">
          <p className="text-xs text-muted-foreground">{copy.vaciar.export}</p>

          <div className="space-y-1.5">
            <Label htmlFor="confirmacion">{copy.vaciar.confirmLabel(nombre)}</Label>
            <CampoDeContrasena
              id="confirmacion"
              autoComplete="current-password"
              value={contrasena}
              onChange={setContrasena}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => cerrar(false)}>
              {copy.vaciar.cancel}
            </Button>
            {/* `destructive` acá y en ningún otro lado de la pantalla: el rojo es el color del
                dato que está mal, y gastarlo en botones comunes lo apaga para cuando importa.
                Acá importa. */}
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={vaciar.isPending || contrasena === ''}
            >
              {vaciar.isPending ? copy.vaciar.emptying : copy.vaciar.confirm}
            </Button>
          </div>
        </form>
      </FormDialog>
    </Seccion>
  )
}
