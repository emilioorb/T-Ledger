import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { queryClient } from '@/router'
import { organization, useSession } from './auth-client'
import { copy } from './copy'
import { gestoDeFormulario } from './gesto'
import { MarcoDeIdentidad } from './marco-de-identidad'
import { cabeceraDelToken, useTokenDelEnlace } from './token-del-enlace'

const clave = (invitacion: string) => `token-invitacion:${invitacion}`

// El token tiene que sobrevivir al paso por «entrar», que lo saca de la URL. Queda en la
// pestaña y nada más: sessionStorage se borra al cerrarla.
const tokenDeLaInvitacion = (invitacion: string, delEnlace: string | undefined): string | undefined => {
  try {
    if (delEnlace) sessionStorage.setItem(clave(invitacion), delEnlace)
    return delEnlace ?? sessionStorage.getItem(clave(invitacion)) ?? undefined
  } catch {
    return delEnlace
  }
}

const olvidarToken = (invitacion: string) => {
  try {
    sessionStorage.removeItem(clave(invitacion))
  } catch {
    return
  }
}

// Unirse a un libro ajeno con la cuenta propia. Aceptar exige el token del enlace de esa
// invitación, que el servidor compara: el correo solo no alcanza, porque no se verifica.
export const Unirse = () => {
  const { invitacion } = useSearch({ from: '/unirse' })
  const navegar = useNavigate()
  const delEnlace = useTokenDelEnlace()
  const [token] = useState(() => (invitacion ? tokenDeLaInvitacion(invitacion, delEnlace) : undefined))
  const { data: sesion, isPending } = useSession()
  const [uniendo, setUniendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unirse = async (invitationId: string) => {
    setUniendo(true)
    setError(null)
    const { data, error: rechazo } = await organization.acceptInvitation(
      { invitationId },
      { headers: cabeceraDelToken(token) },
    )
    if (rechazo || !data) {
      setUniendo(false)
      setError(copy.unirse.unavailable)
      return
    }
    olvidarToken(invitationId)
    await organization.setActive({ organizationId: data.invitation.organizationId })
    // La caché puede tener el libro en el que estaba: se vacía para no mezclar dos en pantalla.
    queryClient.clear()
    void navegar({ to: '/tablero' })
  }

  const contenido = () => {
    if (!invitacion || !token) return <p className="mt-2 text-sm text-muted-foreground">{copy.unirse.incomplete}</p>
    if (isPending) return null
    if (!sesion)
      return (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{copy.unirse.needsAccount}</p>
          <Button asChild className="mt-8 h-11 w-full sm:h-9">
            <Link to="/entrar" search={{ redirigirA: `/unirse?invitacion=${encodeURIComponent(invitacion)}` }}>
              {copy.unirse.signIn}
            </Link>
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">{copy.unirse.noAccount}</p>
        </>
      )
    return (
      <>
        <p className="mt-2 text-sm text-muted-foreground">{copy.unirse.withSession(sesion.user.email)}</p>
        {error ? (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-8 h-11 w-full sm:h-9"
          disabled={uniendo}
          onClick={() => void unirse(invitacion)}
        >
          {uniendo ? copy.unirse.joining : copy.unirse.join}
        </Button>
      </>
    )
  }

  return (
    <MarcoDeIdentidad
      gesto={gestoDeFormulario({ enviando: uniendo, fallo: error !== null, escribiendoContrasena: false })}
    >
      <h1 className="text-2xl font-semibold tracking-tight 2xl:text-3xl">{copy.unirse.title}</h1>
      {contenido()}
    </MarcoDeIdentidad>
  )
}
