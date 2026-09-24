// Las pantallas donde todavía no sos nadie. No llevan barra lateral —no hay a dónde navegar
// sin sesión— y son las únicas a las que se entra sin ella.
// La landing entra acá por dos motivos a la vez: no pide sesión, y no lleva barra lateral.
// `beforeLoad` la compara contra el pathname y el componente contra el `routeId`, y para la
// raíz las dos cosas son '/'.
// `/unirse` también: la pantalla tiene que leer el token del enlace antes de mandar a entrar, o
// terminaría en la query de `redirigirA`, que sí llega a los logs.
const PUBLICAS = ['/', '/entrar', '/crear-cuenta', '/unirse']

export const esPublica = (ruta: string): boolean => PUBLICAS.includes(ruta)
