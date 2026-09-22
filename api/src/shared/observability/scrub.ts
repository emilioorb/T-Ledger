import type { Breadcrumb, ErrorEvent, RequestEventData, User } from '@sentry/node'

// Las únicas cabeceras que salen del servidor. La lista es corta a propósito: `authorization`
// lleva la sesión, `cookie` lo mismo, y `user-agent` junto con la IP identifica a una persona.
const CABECERAS_PERMITIDAS: readonly string[] = ['content-type', 'content-length']

// La petición se vuelve a armar campo por campo en vez de borrarle los que molestan. Es la
// diferencia entre permitir y prohibir: si Sentry agrega mañana otro campo con el cuerpo
// adentro, acá no entra solo, mientras que una lista de prohibidos lo dejaría pasar hasta que
// alguien se acuerde de sumarlo.
const soloLoUbicable = (request: RequestEventData): RequestEventData => ({
  ...(request.url !== undefined && { url: request.url }),
  ...(request.method !== undefined && { method: request.method }),
  headers: Object.fromEntries(
    Object.entries(request.headers ?? {}).filter(([nombre]) =>
      CABECERAS_PERMITIDAS.includes(nombre.toLowerCase()),
    ),
  ),
})

// El id alcanza para lo único que importa: si el error le pasó a una persona o a doscientas.
// Quién es se resuelve contra la base, que es donde vive esa relación.
const soloElId = (user: User): User => ({ ...(user.id !== undefined && { id: user.id }) })

// Una miga de tipo http arrastra el cuerpo de la petición en `data`, y en el navegador las de
// tipo `ui.input` guardan lo que la persona escribió. Los demás campos son metadatos —el
// mensaje, la categoría, el momento— y son los que sirven para reconstruir el camino.
const sinDatos = (miga: Breadcrumb): Breadcrumb => {
  const copia = { ...miga }
  delete copia.data
  return copia
}

// Sentry se lleva el cuerpo de las peticiones si uno lo deja. Un error en `POST /movimientos`
// viajaría con el monto, la descripción y la categoría hacia un tercero en otro país, que es
// justo lo que el producto promete no hacer.
//
// El filtro deniega por defecto. Un filtro que falla abierto en un sistema de privacidad es
// peor que no tener filtro, porque da confianza falsa.
// Prisma serializa la consulta **entera** dentro del mensaje del error: el `where` con los
// filtros, el id del libro y el texto que la persona escribió en un buscador. El request ya se
// filtra campo por campo, pero por acá los mismos datos volvían a entrar por la puerta de
// atrás —medido en un evento real: llegó a Sentry el término buscado y el `bookId`—.
//
// Se conserva qué llamada falló y por qué, que es lo único que sirve para arreglarlo, y se
// descarta el cuerpo. Un mensaje recortado se depura igual; uno con los datos adentro
// incumple lo que el producto promete.
const CUERPO_DE_CONSULTA = ' invocation:'

export const sinCuerpoDeConsulta = (mensaje: string): string => {
  const corte = mensaje.indexOf(CUERPO_DE_CONSULTA)
  if (corte === -1) return mensaje

  const lineas = mensaje.trimEnd().split('\n')
  const razon = lineas[lineas.length - 1]?.trim() ?? ''
  const llamada = mensaje.slice(0, corte + CUERPO_DE_CONSULTA.length)
  return razon === '' ? llamada : `${llamada} ${razon}`
}

const sinDatosDeLaConsulta = (exception: NonNullable<ErrorEvent['exception']>) => ({
  ...exception,
  // La propiedad se omite en vez de quedar en `undefined`: el proyecto compila con
  // `exactOptionalPropertyTypes`, donde las dos cosas no son lo mismo.
  ...(exception.values
    ? {
        values: exception.values.map((valor) => ({
          ...valor,
          ...(valor.value === undefined ? {} : { value: sinCuerpoDeConsulta(valor.value) }),
        })),
      }
    : {}),
})

export const scrub = (event: ErrorEvent): ErrorEvent => {
  const limpio: ErrorEvent = { ...event }

  delete limpio.extra
  if (limpio.request) limpio.request = soloLoUbicable(limpio.request)
  if (limpio.user) limpio.user = soloElId(limpio.user)
  if (limpio.breadcrumbs) limpio.breadcrumbs = limpio.breadcrumbs.map(sinDatos)
  if (limpio.exception) limpio.exception = sinDatosDeLaConsulta(limpio.exception)

  return limpio
}
