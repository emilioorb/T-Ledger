import { useEffect, useState } from 'react'

// El mismo nombre que espera el servidor (`CABECERA_DEL_TOKEN` en auth.config). Va en una
// cabecera y no en el cuerpo del registro: el cuerpo acepta objetos, y un objeto no es un token.
const CABECERA_DEL_TOKEN = 'x-token-invitacion'

export interface DatosDelEnlace {
  token?: string
  // Solo lo trae el enlace de acceso a la app, para dejar el correo ya puesto.
  correo?: string
}

export const datosDelFragmento = (fragmento: string): DatosDelEnlace => {
  const parametros = new URLSearchParams(fragmento.replace(/^#/, ''))
  const token = parametros.get('token') || undefined
  const correo = parametros.get('correo') || undefined
  return { ...(token ? { token } : {}), ...(correo ? { correo } : {}) }
}

// Lo que trae el enlace se lee una vez, al abrir, y se borra de la barra de direcciones: así no
// se copia sin querer al compartir la URL. El historial del navegador puede guardar la visita
// original; lo acota que el token sirve una vez, para un correo, y solo mientras la invitación
// esté vigente (una semana la de la app, dos días la de un libro).
export const useDatosDelEnlace = (): DatosDelEnlace => {
  const [datos] = useState(() => datosDelFragmento(window.location.hash))

  useEffect(() => {
    if (!window.location.hash) return
    const { pathname, search } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}`)
  }, [])

  return datos
}

export const cabeceraDelToken = (token: string | undefined): Record<string, string> =>
  token ? { [CABECERA_DEL_TOKEN]: token } : {}
