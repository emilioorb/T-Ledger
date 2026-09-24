// Los enlaces de invitación que se le pasan a la persona. El token va en el fragmento y no en la
// búsqueda: el fragmento no sale del navegador, así que no queda en los logs del servidor ni en
// el Referer. La pantalla lo lee al abrir y lo borra de la barra de direcciones.
//
// El de la app crea la cuenta; el de un libro sirve para unirse con una cuenta que ya existe.
const conToken = (url: string, token: string) => `${url}#token=${token}`

export const enlaceALaApp = (origen: string, correo: string, token: string): string =>
  conToken(`${origen}/crear-cuenta?correo=${encodeURIComponent(correo)}`, token)

export const enlaceAlLibro = (origen: string, invitationId: string, token: string): string =>
  conToken(`${origen}/unirse?invitacion=${encodeURIComponent(invitationId)}`, token)

export const correoDeLaBusqueda = (busqueda: Record<string, unknown>): string | undefined =>
  typeof busqueda.correo === 'string' ? busqueda.correo : undefined
