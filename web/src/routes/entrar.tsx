import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/features/identity/auth-client'
import { CampoDeContrasena } from '@/features/identity/campo-de-contrasena'
import { copy } from '@/features/identity/copy'
import { MarcoDeIdentidad } from '@/features/identity/marco-de-identidad'
import { gestoDeFormulario } from '@/features/identity/gesto'
import { queryClient } from '@/router'

const EntrarScreen = () => {
  const navegar = useNavigate()
  const { redirigirA, motivo } = Route.useSearch()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entrar = async (evento: FormEvent) => {
    evento.preventDefault()
    setEntrando(true)
    setError(null)

    await signIn.email(
      { email: correo, password: contrasena },
      {
        onSuccess: () => {
          // La caché puede tener datos de quien usó esta pantalla antes. Vaciarla acá es lo
          // que evita que el primer instante después de entrar muestre plata ajena.
          queryClient.clear()
          void navegar({ to: redirigirA ?? '/' })
        },
        // Tres casos y no dos. Sin conexión no es culpa de nadie; un 401 sí es una credencial
        // equivocada —sin decir cuál de las dos, que confirmaría qué correos tienen cuenta—; y
        // cualquier otra cosa es un problema del servidor que no hay que disfrazar de error de
        // tecleo.
        onError: ({ error: fallo }) => {
          if (fallo.status === 0) setError(copy.entrar.unreachable)
          else if (fallo.status === 401) setError(copy.entrar.failed)
          else setError(copy.entrar.rejected)
          setEntrando(false)
        },
      },
    )
  }

  return (
    <MarcoDeIdentidad
      gesto={gestoDeFormulario({
        enviando: entrando,
        fallo: error !== null,
        escribiendoContrasena: contrasena.length > 0,
      })}
    >
      <h1 className="text-2xl font-semibold tracking-tight 2xl:text-3xl">{copy.entrar.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.entrar.subtitle}</p>

      {/* `role="status"` y no `alert`: es una explicación, no una falla. Quien vuelve y se
          encuentra el formulario merece saber por qué, o va a creer que la app lo echó. */}
      {motivo === 'inactividad' ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        >
          {copy.entrar.closedByIdle}
        </p>
      ) : null}

      <form onSubmit={entrar} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="correo">{copy.entrar.email}</Label>
          <Input
            id="correo"
            type="email"
            autoComplete="email"
            placeholder={copy.entrar.emailPlaceholder}
            required
            autoFocus
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            // 44 px en teléfono, que es el mínimo que un dedo acierta sin pelear. Arriba de
            // `sm` manda el mouse y vuelve a la altura del resto de la app.
            className="h-11 sm:h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contrasena">{copy.entrar.password}</Label>
          <CampoDeContrasena
            id="contrasena"
            autoComplete="current-password"
            placeholder={copy.entrar.passwordPlaceholder}
            value={contrasena}
            onChange={setContrasena}
            className="h-11 sm:h-9"
          />
        </div>

        {/* `role="alert"` para que un lector de pantalla lo anuncie: quien no ve la pantalla
            se entera de que falló solo si algo se lo dice. */}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-11 w-full sm:h-9" disabled={entrando}>
          {entrando ? copy.entrar.submitting : copy.entrar.submit}
        </Button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">{copy.entrar.noAccount}</p>
    </MarcoDeIdentidad>
  )
}

interface Busqueda {
  // A dónde volver después de entrar. Lo pone el guard de la raíz cuando intercepta una
  // navegación: sin esto, quien seguía un enlace a una pantalla puntual termina en el tablero
  // y tiene que volver a buscarla.
  redirigirA?: string
  // Por qué está acá, cuando no fue él quien pidió salir. Hoy solo lo pone el vigilante de
  // inactividad.
  motivo?: 'inactividad'
}

export const Route = createFileRoute('/entrar')({
  component: EntrarScreen,
  validateSearch: (busqueda: Record<string, unknown>): Busqueda => ({
    ...(typeof busqueda.redirigirA === 'string' ? { redirigirA: busqueda.redirigirA } : {}),
    ...(busqueda.motivo === 'inactividad' ? { motivo: 'inactividad' as const } : {}),
  }),
})
