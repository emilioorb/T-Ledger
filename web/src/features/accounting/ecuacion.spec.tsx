import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Ecuacion } from './ecuacion'

describe('Ecuacion', () => {
  it('cada operador va pegado al monto que le sigue, para no quedar colgando al partir la línea', () => {
    render(
      <Ecuacion
        resultado={<span>total</span>}
        terminos={[
          { operador: '=', valor: <span>pasivo</span> },
          { operador: '+', valor: <span>patrimonio</span> },
        ]}
      />,
    )

    const igual = screen.getByText('=').parentElement
    const mas = screen.getByText('+').parentElement
    expect(igual).toHaveTextContent('=pasivo')
    expect(igual).toHaveClass('whitespace-nowrap')
    expect(mas).toHaveTextContent('+patrimonio')
    expect(screen.getByText('total').parentElement).not.toBe(igual)
  })
})
