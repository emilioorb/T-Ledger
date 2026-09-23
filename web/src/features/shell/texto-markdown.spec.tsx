import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sinMarcas, TextoMarkdown } from './texto-markdown'

describe('TextoMarkdown', () => {
  it('dibuja negritas, código, enlaces y listas anidadas', () => {
    render(
      <TextoMarkdown>
        {'- Una **negrita** y `g h`\n  - un [enlace](https://ejemplo.com)\n- Otra'}
      </TextoMarkdown>,
    )
    expect(screen.getByText('negrita').tagName).toBe('STRONG')
    expect(screen.getByText('g h').tagName).toBe('CODE')
    expect(screen.getByRole('link', { name: 'enlace' })).toHaveAttribute('href', 'https://ejemplo.com')
    expect(screen.getAllByRole('list')).toHaveLength(2)
  })

  it('dibuja tablas', () => {
    render(<TextoMarkdown>{'| a | b |\n| - | - |\n| 1 | 2 |'}</TextoMarkdown>)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('no deja pasar HTML crudo', () => {
    const { container } = render(<TextoMarkdown>{'Hola <script>alert(1)</script>'}</TextoMarkdown>)
    expect(container.querySelector('script')).toBeNull()
  })

  it('en línea no abre párrafos, para vivir dentro de un renglón', () => {
    const { container } = render(<TextoMarkdown enLinea>{'Tocá **Guardar**'}</TextoMarkdown>)
    expect(container.querySelector('p')).toBeNull()
    expect(screen.getByText('Guardar').tagName).toBe('STRONG')
  })
})

describe('sinMarcas', () => {
  it('deja el texto que se lee, sin las marcas', () => {
    expect(sinMarcas('Tocá **Guardar** y `g h`, o [la guía](/guia)')).toBe('Tocá Guardar y g h, o la guía')
  })
})

describe('los títulos', () => {
  it('se distinguen del texto: más grandes y con peso', () => {
    render(<TextoMarkdown>{'## Montos\n\nUn párrafo.\n\n### Tasa'}</TextoMarkdown>)
    expect(screen.getByRole('heading', { level: 2, name: 'Montos' })).toHaveClass('font-semibold')
    expect(screen.getByRole('heading', { level: 3, name: 'Tasa' })).toHaveClass('font-semibold')
  })
})
