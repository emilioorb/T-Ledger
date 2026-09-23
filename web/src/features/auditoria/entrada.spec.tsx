import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DetalleCompleto } from './entrada'

const notas = '## Contrato\nUna nota larga que tiene que partirse en renglones en vez de salirse de la pantalla.'

describe('DetalleCompleto', () => {
  // Vive dentro de una celda de tabla, que por defecto no deja partir el texto: sin esto, unas
  // notas o la clave de un archivo se estiraban en un solo renglón hasta salirse del registro.
  it('parte los valores largos en renglones y respeta los saltos de línea', () => {
    render(<DetalleCompleto cambios={[{ campo: 'notes', antes: null, despues: notas }]} />)

    const valor = screen.getByText(/Una nota larga/)
    expect(valor).toHaveClass('whitespace-pre-wrap')
    expect(valor).toHaveClass('[overflow-wrap:anywhere]')
  })
})
