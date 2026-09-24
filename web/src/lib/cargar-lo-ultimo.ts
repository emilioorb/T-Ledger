import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

const EVENTO = 'cargar-lo-ultimo'

// Lo que hace «Cargar lo último» del aviso de EDITADO_POR_OTRO: recargar lo que está en pantalla y,
// ya con los datos nuevos, avisar a los formularios abiertos para que se rearmen con la versión
// nueva. Solo ante este pedido: rearmarlos con cualquier recarga en segundo plano (al volver a la
// pestaña) borraría lo que se está escribiendo sin que nadie lo pida.
export const cargarLoUltimo = async (client: QueryClient): Promise<void> => {
  await client.invalidateQueries()
  window.dispatchEvent(new Event(EVENTO))
}

// Para el formulario abierto: `rearmar` corre cuando la persona pidió cargar lo último. Recibe la
// caché para leer lo nuevo de ahí: cuando llega el aviso, React todavía puede no haber redibujado
// con los datos recargados, y lo del último render sería lo viejo.
export const useAlCargarLoUltimo = (rearmar: (cache: QueryClient) => void): void => {
  const cache = useQueryClient()
  const actual = useRef(rearmar)
  actual.current = rearmar
  useEffect(() => {
    const escuchar = () => actual.current(cache)
    window.addEventListener(EVENTO, escuchar)
    return () => window.removeEventListener(EVENTO, escuchar)
  }, [cache])
}

type Entidad = Record<string, unknown>

const dentroDe = (dato: unknown, campo: string): Entidad[] => {
  if (Array.isArray(dato)) return dato as Entidad[]
  if (dato && typeof dato === 'object' && 'data' in dato && Array.isArray(dato.data)) return dato.data as Entidad[]
  if (dato && typeof dato === 'object' && campo in dato) return [dato as Entidad]
  return []
}

// Lo último de una entidad, buscado por su id (o el campo que la identifique) en todas las
// consultas de la caché bajo esa clave: una lista, una página (`{ data }`) o el detalle. Así cada
// pantalla rearma su formulario sin saber con qué filtros se pidió la lista.
export const loUltimoDe = <T extends object>(
  cache: QueryClient,
  queryKey: readonly unknown[],
  valor: string,
  campo: keyof T & string = 'id' as keyof T & string,
): T | undefined => {
  // Con `version`: bajo la misma clave conviven otras formas con el mismo campo (el árbol de
  // cuentas tiene `code` y no `version`), y rearmar un formulario con una de esas mandaría la
  // edición sin versión, que es pisar a ciegas. Y de todas las copias, la más nueva: una consulta
  // inactiva, de otra página o de una visita anterior, puede guardar una versión vieja.
  let masNueva: Entidad | undefined
  for (const [, dato] of cache.getQueriesData({ queryKey })) {
    for (const entidad of dentroDe(dato, campo)) {
      if (entidad[campo] !== valor || typeof entidad.version !== 'number') continue
      if (!masNueva || entidad.version > (masNueva.version as number)) masNueva = entidad
    }
  }
  return masNueva as T | undefined
}

