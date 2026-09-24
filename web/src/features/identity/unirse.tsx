import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { copy as libro } from '@/features/libro/copy'
import { queryClient } from '@/router'
import { organization, signOut, useSession } from './auth-client'
import { copy } from './copy'
import { gestoDeFormulario } from './gesto'
import { MarcoDeIdentidad } from './marco-de-identidad'
import { olvidarLaSesionLocal } from './salir'
import { cabeceraDelToken, useDatosDelEnlace } from './token-del-enlace'

const clave = (invitacion: string) => `token-invitacion:${invitacion}`

// El token tiene que sobrevivir al paso por «entrar», que lo saca de la URL. Queda en la
// pestaña y nada más: sessionStorage se borra al cerrarla, y se borra antes si la invitación ya
// no sirve.
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

const ROLES = libro.gente.roles
const queHara = (rol: string) =>
  rol in ROLES ? `«${ROLES[rol as keyof typeof ROLES].name}»: ${ROLES[rol as keyof typeof ROLES].hint}` : rol

// Sin conexión no es culpa de la invitación: decirle «no está disponible» la mandaría a pedir
// otra que no hace falta.
const sinRed = (fallo: { status: number }) => fallo.status === 0

// Unirse a un libro ajeno con la cuenta propia. Aceptar exige el token del enlace de esa
// invitación, que el servidor compara: el correo solo no alcanza, porque no se verifica.
export const Unirse = () => {
  const { invitacion } = useSearch({ from: '/unirse' })
  const navegar = useNavigate()
  const { token: delEnlace } = useDatosDelEnlace()
  const [token] = useState(() => (invitacion ? tokenDeLaInvitacion(invitacion, delEnlace) : undefined))
  const { data: sesion, isPending } = useSession()
  const [uniendo, setUniendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detalle = useQuery({
    queryKey: ['identity', 'invitation', invitacion],
    enabled: Boolean(sesion && invitacion && token),
    retry: false,
    // El fallo es parte de la respuesta y no una excepción: cada uno se muestra distinto.
    queryFn: async () => {
      const id = invitacion ?? ''
      const { data, error: fallo } = await organization.getInvitation({ query: { id } })
      if (!fallo && data) return { invitacion: data }
      const estado = fallo?.status ?? 0
      // 403 es otra cuenta: el token le sigue sirviendo a la dueña del correo.
      if (estado !== 0 && estado !== 403) olvidarToken(id)
      return { estado }
    },
  })

  const unirse = async (invitationId: string) => {
    setUniendo(true)
    setError(null)
    const { data, error: rechazo } = await organization.acceptInvitation(
      { invitationId },
      { headers: cabeceraDelToken(token) },
    )
    if (rechazo || !data) {
      setUniendo(false)
      if (rechazo && sinRed(rechazo)) return setError(copy.entrar.unreachable)
      olvidarToken(invitationId)
      return setError(copy.unirse.unavailable)
    }
    olvidarToken(invitationId)
    const { error: sinAbrir } = await organization.setActive({ organizationId: data.invitation.organizationId })
    if (sinAbrir) {
      setUniendo(false)
      return setError(copy.unirse.joinedNotOpened)
    }
    // La caché puede tener el libro en el que estaba: se vacía para no mezclar dos en pantalla.
    queryClient.clear()
    void navegar({ to: '/tablero' })
  }

  const entrarConOtra = async () => {
    await signOut()
    olvidarLaSesionLocal(queryClient)
    void navegar({ to: '/entrar', search: { redirigirA: `/unirse?invitacion=${encodeURIComponent(invitacion ?? '')}` } })
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
    if (!detalle.data) return null
    if ('estado' in detalle.data) {
      const { estado } = detalle.data
      if (estado === 403)
        return (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{copy.unirse.otherAccount(sesion.user.email)}</p>
            <Button type="button" variant="secondary" className="mt-8 h-11 w-full sm:h-9" onClick={() => void entrarConOtra()}>
              {copy.unirse.switchAccount}
            </Button>
          </>
        )
      return (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {estado === 0 ? copy.entrar.unreachable : copy.unirse.unavailable}
        </p>
      )
    }
    const { invitacion: detalleDeLaInvitacion } = detalle.data
    return (
      <>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.unirse.invitedBy(
            detalleDeLaInvitacion.inviterEmail,
            detalleDeLaInvitacion.organizationName,
            queHara(detalleDeLaInvitacion.role),
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.unirse.withSession(sesion.user.email)}</p>
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
