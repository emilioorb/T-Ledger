interface CategoriaElegible {
  id: string
  kind: string
  accountCode?: string | null
  active: boolean
}

// La categoría con la que se registra el pago de una cuota: la de gasto cuya cuenta alimenta la
// cubeta de la deuda. Así el pago cae en la cubeta que la deuda consume, que es lo que el
// presupuesto espera. Sin una que calce no se adivina: vacío, y la persona elige.
export const categoriaSugerida = (
  categorias: readonly CategoriaElegible[],
  cuentasDeLaCubeta: readonly string[],
): string =>
  categorias.find(
    (categoria) =>
      categoria.kind === 'EXPENSE' &&
      categoria.active &&
      categoria.accountCode != null &&
      cuentasDeLaCubeta.includes(categoria.accountCode),
  )?.id ?? ''
