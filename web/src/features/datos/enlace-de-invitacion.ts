// Los enlaces de invitación que se le pasan a la persona. El token va en el fragmento y no en la
// búsqueda: el fragmento no sale del navegador, así que no queda en los logs del servidor ni en
// el Referer. Crear cuenta lo lee al abrir y lo borra de la barra de direcciones.
const conToken = (url: string, token: string) => `${url}#token=${token}`

export const enlaceALaApp = (origen: string, correo: string, token: string): string =>
  conToken(`${origen}/crear-cuenta?correo=${encodeURIComponent(correo)}`, token)

export const enlaceAlLibro = (origen: string, invitationId: string, token: string): string =>
  conToken(`${origen}/crear-cuenta?invitacion=${encodeURIComponent(invitationId)}`, token)

export const correoDeLaBusqueda = (busqueda: Record<string, unknown>): string | undefined =>
  typeof busqueda.correo === 'string' ? busqueda.correo : undefined
