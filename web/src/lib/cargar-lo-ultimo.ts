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
  for (const [, dato] of cache.getQueriesData({ queryKey })) {
    const encontrado = dentroDe(dato, campo).find((entidad) => entidad[campo] === valor)
    if (encontrado) return encontrado as T
  }
  return undefined
}

