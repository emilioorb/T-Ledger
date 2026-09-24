import type { QueryClient } from '@tanstack/react-query'

// Lo importa el router, que va en el bundle de entrada: acá solo lo mínimo. Lo que usan las
// pantallas vive en `usar-lo-ultimo.ts`.
export const EVENTO_CARGAR_LO_ULTIMO = 'cargar-lo-ultimo'

// Lo que hace «Cargar lo último» del aviso de EDITADO_POR_OTRO: recargar lo que está en pantalla y,
// ya con los datos nuevos, avisar a los formularios abiertos para que se rearmen con la versión
// nueva. Solo ante este pedido: rearmarlos con cualquier recarga en segundo plano (al volver a la
// pestaña) borraría lo que se está escribiendo sin que nadie lo pida.
export const cargarLoUltimo = async (client: QueryClient): Promise<void> => {
  await client.invalidateQueries()
  window.dispatchEvent(new Event(EVENTO_CARGAR_LO_ULTIMO))
}
