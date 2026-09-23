export interface Arranque {
  // Si el #root llegó con la portada prerenderizada adentro.
  traePortada: boolean
  // Dónde quedó el router después de `router.load()`.
  ruta: string
  // El del primer match que no terminó bien; una redirección queda como `redirected`.
  estado: 'pending' | 'success' | 'error' | 'notFound' | 'redirected'
}

// Hidratar solo sirve si el primer render del cliente es exactamente el HTML que llegó: la
// portada, cargada sin error ni redirección. En cualquier otro caso se crea desde cero.
export const modoDeArranque = ({ traePortada, ruta, estado }: Arranque): 'hidratar' | 'crear' =>
  traePortada && ruta === '/' && estado === 'success' ? 'hidratar' : 'crear'

// public/antes-de-pintar.js marca el documento cuando manda a quien tuvo sesión al tablero: esa
// página ya viene en camino, y arrancar la app acá sería pedir la sesión dos veces para nada.
export const estaRedirigiendo = (raiz: HTMLElement): boolean => raiz.dataset.redirigiendo !== undefined

// Cargar el router antes de hidratar. Si falla, la portada no se puede hidratar: se crea desde
// cero, y el error queda reportado en vez de dejar una portada quieta sin app detrás.
export const cargarParaHidratar = async (
  cargar: () => Promise<void>,
  reportar: (error: unknown) => void,
): Promise<boolean> => {
  try {
    await cargar()
    return true
  } catch (error) {
    reportar(error)
    return false
  }
}
