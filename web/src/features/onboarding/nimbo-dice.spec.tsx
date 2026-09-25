import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NimboDice } from './nimbo-dice'

describe('NimboDice', () => {
  it('muestra lo que dice con un id para describir el paso', () => {
    render(<NimboDice gesto="contento" id="dice-intro">Hola</NimboDice>)
    expect(screen.getByText('Hola')).toHaveAttribute('id', 'dice-intro')
  })

  it('Nimbo es decorativo: no se anuncia', () => {
    const { container } = render(<NimboDice gesto="neutro" id="x">Algo</NimboDice>)
    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
