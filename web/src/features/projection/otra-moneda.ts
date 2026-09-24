// Si algo de lo que la proyección suma está en otra moneda que la que se mira. La proyección va
// de a una moneda: sin este aviso, una deuda en dólares desaparecería del tablero en colones y
// quedaría más plata libre de la que hay.
export const hayOtraMoneda = (montos: readonly { currency: string }[], moneda: string): boolean =>
  montos.some((monto) => monto.currency !== moneda)
