// Los enlaces de invitación que se le pasan a la persona. El token va en el fragmento y no en la
// búsqueda: el fragmento no sale del navegador, así que no queda en los logs del servidor ni en
// el Referer. La pantalla lo lee al abrir y lo borra de la barra de direcciones. El correo del
// enlace de acceso va con él, por lo mismo: es un dato de una persona.
//
// El de la app crea la cuenta; el de un libro sirve para unirse con una cuenta que ya existe.
export const enlaceALaApp = (origen: string, correo: string, token: string): string =>
  `${origen}/crear-cuenta#${new URLSearchParams({ token, correo })}`

export const enlaceAlLibro = (origen: string, invitationId: string, token: string): string =>
  `${origen}/unirse?invitacion=${encodeURIComponent(invitationId)}#${new URLSearchParams({ token })}`
