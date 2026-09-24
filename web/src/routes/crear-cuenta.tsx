import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { TEXT_LINK } from '@/components/text-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/features/identity/auth-client'
import { CampoDeContrasena } from '@/features/identity/campo-de-contrasena'
import { copy } from '@/features/identity/copy'
import { gestoDeFormulario } from '@/features/identity/gesto'
import { MarcoDeIdentidad } from '@/features/identity/marco-de-identidad'
import { cabeceraDelToken, useTokenDelEnlace } from '@/features/identity/token-del-enlace'
import { queryClient } from '@/router'
import { correoDeLaBusqueda } from '@/features/datos/enlace-de-invitacion'

// Crear la cuenta con el enlace de acceso que da quien administra la instancia. El servidor
// decide si puede: la regla vive en `puedeRegistrarse` y no acá, porque una comprobación en el
// navegador no protege nada. Lo que la pantalla aporta es el token del enlace. Los enlaces de un
// libro no llegan acá: van a `/unirse`, con una cuenta que ya existe.
//
// Sirve también sin enlace, para la primera cuenta de una instancia recién levantada, a quien
// no la puede invitar nadie.
const CrearCuentaScreen = () => {
  const navegar = useNavigate()
  const { correo: correoDelEnlace } = Route.useSearch()
  const token = useTokenDelEnlace()
  const [nombre, setNombre] = useState('')
  // Con el correo del enlace de invitación ya puesto: es el que la invitación deja pasar.
  const [correo, setCorreo] = useState(correoDelEnlace ?? '')
  const [contrasena, setContrasena] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fallar = (mensaje: string) => {
    setError(mensaje)
    setCreando(false)
  }

  const crear = async (evento: FormEvent) => {
    evento.preventDefault()
    setCreando(true)
    setError(null)

    await signUp.email(
      { name: nombre, email: correo, password: contrasena },
      {
        headers: cabeceraDelToken(token),
        onSuccess: () => {
          queryClient.clear()
          void navegar({ to: '/tablero' })
        },
        // El 403 es la regla de registro del servidor: no hay enlace de acceso vigente para ese
        // correo. El 422 es el correo repetido. Lo demás no se disfraza de error de tecleo.
        onError: ({ error: fallo }) => {
          if (fallo.status === 0) fallar(copy.entrar.unreachable)
          else if (fallo.status === 403) fallar(copy.crear.notInvited)
          else if (fallo.status === 422) fallar(copy.crear.taken)
          else fallar(copy.crear.failed)
        },
      },
    )
  }

  return (
    <MarcoDeIdentidad
      gesto={gestoDeFormulario({
        enviando: creando,
        fallo: error !== null,
        escribiendoContrasena: contrasena.length > 0,
      })}
    >
      <h1 className="text-2xl font-semibold tracking-tight 2xl:text-3xl">{copy.crear.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {correoDelEnlace ? copy.crear.invited : copy.crear.alone}
      </p>

      <form onSubmit={crear} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">{copy.crear.name}</Label>
          <Input
            id="nombre"
            autoComplete="name"
            placeholder={copy.crear.namePlaceholder}
            required
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="h-11 sm:h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="correo">{copy.entrar.email}</Label>
          <Input
            id="correo"
            type="email"
            autoComplete="email"
            placeholder={copy.entrar.emailPlaceholder}
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="h-11 sm:h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contrasena">{copy.entrar.password}</Label>
          <CampoDeContrasena
            id="contrasena"
            autoComplete="new-password"
            placeholder={copy.entrar.passwordPlaceholder}
            value={contrasena}
            onChange={setContrasena}
            className="h-11 sm:h-9"
          />
          {/* El mínimo se dice antes de escribir. Enterarse de que son ocho después de que el
              servidor rechace la contraseña es hacer el trabajo dos veces. */}
          <p className="text-xs text-muted-foreground">{copy.crear.passwordHint}</p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-11 w-full sm:h-9" disabled={creando}>
          {creando ? copy.crear.submitting : copy.crear.submit}
        </Button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        {copy.crear.haveAccount}{' '}
        <Link to="/entrar" className={TEXT_LINK}>
          {copy.crear.signIn}
        </Link>
      </p>
    </MarcoDeIdentidad>
  )
}

interface Busqueda {
  // El correo del enlace de acceso, ya puesto. Sin él la pantalla sigue sirviendo: es el caso
  // de la primera cuenta.
  correo?: string
}

export const Route = createFileRoute('/crear-cuenta')({
  component: CrearCuentaScreen,
  validateSearch: (busqueda: Record<string, unknown>): Busqueda => {
    const correo = correoDeLaBusqueda(busqueda)
    return correo ? { correo } : {}
  },
})
