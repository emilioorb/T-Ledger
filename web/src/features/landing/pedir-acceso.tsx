import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { copy } from './copy'

const MAILTO = `mailto:${copy.acceso.email}?subject=${encodeURIComponent(copy.acceso.subject)}`

// Pedir acceso no es registrarse: no hay formulario, no hay endpoint y no se guarda nada. Del
// otro lado hay una persona, y la pantalla no finge que hay un sistema.
//
// El modal y no solo el `mailto:`, que es lo barato: quien no tiene cliente de correo
// configurado toca el enlace y no pasa nada, y no se entera de por qué. Con la dirección a la
// vista siempre hay salida.
export const PedirAcceso = () => {
  const [abierto, setAbierto] = useState(false)
  const [copiada, setCopiada] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(copy.acceso.email)
      setCopiada(true)
    } catch {
      // El portapapeles no existe en contextos no seguros y el navegador puede negarlo. La
      // dirección sigue seleccionable a mano, así que esto se dice y no se disimula.
      toast.error(copy.acceso.copyFailed)
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor)
        if (!valor) setCopiada(false)
      }}
    >
      {/* Con `DialogTrigger` y no con un botón que solo prende el estado: Radix necesita saber
          cuál es el disparador para devolverle el foco al cerrar. Medido: con el botón suelto,
          al apretar Escape el foco se caía al `body` y quien navega con teclado perdía el
          lugar. */}
      <DialogTrigger asChild>
        {/* En el teléfono la cabecera no aguanta la frase entera al lado de «Entrar». El
            nombre accesible es siempre el largo, que contiene al corto. */}
        <Button variant="ghost" size="sm" asChild>
          {/* Un mailto de verdad: la portada llega escrita en el HTML y se puede tocar antes
              de que hidrate, y un botón sin JavaScript no hace nada. Ya hidratado abre el modal
              (el estado lo prende acá: con `preventDefault` Radix no alterna). `role="button"`
              porque lo que se anuncia es lo que hace casi siempre: abrir el diálogo. */}
          <a
            href={MAILTO}
            role="button"
            aria-label={copy.acceso.open}
            onClick={(evento) => {
              evento.preventDefault()
              setAbierto(true)
            }}
          >
            <span className="sm:hidden">{copy.acceso.openCorto}</span>
            <span className="hidden sm:inline">{copy.acceso.open}</span>
          </a>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.acceso.title}</DialogTitle>
          <DialogDescription>{copy.acceso.description}</DialogDescription>
        </DialogHeader>

        {/* `select-all`: un clic la selecciona entera. Es la salida para cuando el botón de
              copiar no puede hacer su trabajo. */}
        <p className="num rounded-md border border-border bg-muted/40 px-3 py-2 text-center text-sm select-all">
          {copy.acceso.email}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => void copiar()}>
            {copiada ? copy.acceso.copied : copy.acceso.copy}
          </Button>
          <Button size="sm" asChild>
            <a href={MAILTO}>{copy.acceso.write}</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
