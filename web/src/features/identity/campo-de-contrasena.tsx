import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { copy } from './copy'

interface Props {
  id: string
  value: string
  onChange: (valor: string) => void
  autoComplete?: string
  placeholder?: string
  className?: string
}

// shadcn trae el input pelado: mostrar la contraseña es algo que cada quien arma. Vale la
// pena armarlo bien, porque el que se escribe apurado suele quedar inaccesible.
//
// Es un `<button type="button">` y no un `<div>`: así se llega con Tab y se activa con Enter
// sin escribir un solo manejador de teclado. Y el `type="button"` no es un detalle: dentro de
// un formulario, un botón sin tipo envía el formulario, así que mirar la contraseña haría un
// intento de entrar con ella a medio escribir.
export const CampoDeContrasena = ({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  className,
}: Props) => {
  const [visible, setVisible] = useState(false)
  const Icono = visible ? EyeOffIcon : EyeIcon

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        // Espacio a la derecha para que el texto no pase por debajo del botón cuando la
        // contraseña es larga y está a la vista.
        className={cn('pr-11 sm:pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((antes) => !antes)}
        // El rótulo dice qué va a pasar, no en qué estado está: es lo que un lector de
        // pantalla necesita para decidir si vale la pena activarlo.
        aria-label={visible ? copy.entrar.hidePassword : copy.entrar.showPassword}
        aria-pressed={visible}
        // Once y no diez en teléfono: el dedo necesita 44 px, y este botón es el único
        // control de la pantalla que no se puede agrandar estirando el campo.
        className="absolute inset-y-0 right-0 grid w-11 place-items-center sm:w-10 rounded-r-md text-muted-foreground transition-colors duration-(--duration-press) ease-(--ease-out-quart) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Icono className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
