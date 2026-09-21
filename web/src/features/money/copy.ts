// Decir que el dato está viejo sin alarmar: no es una falla del sistema, es que el banco
// central todavía no publicó. El tono es el mismo del resto, informativo y sin ceremonia.
export const copy = {
  title: 'Tipo de cambio',
  // El rótulo del indicador: lo que se compra y se vende es el dólar, y las dos cifras
  // están en colones. Decirlo así evita repetir «colones» dos veces en la cabecera.
  unit: 'USD',
  source: 'Fuente: BCCR.',
  buy: 'Compra',
  sell: 'Venta',
  publishedAt: (date: string) => `Al ${date}`,
  stale: 'Sin actualizar',
  staleHint: 'El último dato del BCCR tiene más de tres días.',
  empty: 'Todavía no se ha sincronizado con el BCCR.',
  loading: 'Cargando el tipo de cambio',
} as const
