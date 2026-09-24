import { useEffect, useState } from 'react'

// El mismo nombre que espera el servidor (`CABECERA_DEL_TOKEN` en auth.config). Va en una
// cabecera y no en el cuerpo del registro: el cuerpo acepta objetos, y un objeto no es un token.
const CABECERA_DEL_TOKEN = 'x-token-invitacion'

export const tokenDelFragmento = (fragmento: string): string | undefined =>
  new URLSearchParams(fragmento.replace(/^#/, '')).get('token') || undefined

// El token de la invitación se lee una vez, al abrir, y se borra de la barra de direcciones:
// así no se copia sin querer al compartir la URL. El historial del navegador puede guardar la
// visita original; lo acota que el token sirve una vez, para un correo y por una semana.
export const useTokenDelEnlace = (): string | undefined => {
  const [token] = useState(() => tokenDelFragmento(window.location.hash))

  useEffect(() => {
    if (!window.location.hash) return
    const { pathname, search } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}`)
  }, [])

  return token
}

export const cabeceraDelToken = (token: string | undefined): Record<string, string> =>
  token ? { [CABECERA_DEL_TOKEN]: token } : {}
