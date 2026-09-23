import { describe, expect, it } from 'vitest'
import { categoriaSugerida } from './categoria-sugerida'

const categoria = (id: string, accountCode: string | null, kind: 'EXPENSE' | 'INCOME' = 'EXPENSE') => ({
  id,
  name: id,
  kind,
  accountCode,
  active: true,
})

describe('categoriaSugerida', () => {
  it('sugiere la categoría de gasto cuya cuenta alimenta la cubeta de la deuda', () => {
    const categorias = [categoria('compras', '6110'), categoria('prestamos', '6200')]
    expect(categoriaSugerida(categorias, ['6200'])).toBe('prestamos')
  })

  it('sin una que alimente la cubeta, no sugiere nada', () => {
    expect(categoriaSugerida([categoria('compras', '6110')], ['6200'])).toBe('')
  })

  it('no sugiere un ingreso ni una categoría apagada', () => {
    const categorias = [
      categoria('salario', '6200', 'INCOME'),
      { ...categoria('vieja', '6200'), active: false },
    ]
    expect(categoriaSugerida(categorias, ['6200'])).toBe('')
  })
})
