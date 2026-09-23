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
