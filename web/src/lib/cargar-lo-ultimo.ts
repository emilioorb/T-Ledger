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
