// El enlace que el admin le manda a quien pidió acceso: la pantalla de registro con el correo ya
// puesto, que es el que la invitación deja pasar. No lleva ningún secreto: lo que decide es la
// invitación guardada para ese correo, no el enlace.
export const enlaceDeInvitacion = (origen: string, correo: string): string =>
  `${origen}/crear-cuenta?correo=${encodeURIComponent(correo)}`

export const correoDeLaBusqueda = (busqueda: Record<string, unknown>): string | undefined =>
  typeof busqueda.correo === 'string' ? busqueda.correo : undefined
