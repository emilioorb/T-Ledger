import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from './copy'
import { EliminarElLibro } from './eliminar-el-libro'

const conConsultas = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('EliminarElLibro', () => {
  it('ofrece eliminar cuando la persona tiene otro libro', () => {
    conConsultas(<EliminarElLibro nombre="Casa" unico={false} />)

    expect(screen.getByRole('button', { name: copy.borrar.open })).toBeEnabled()
  })

  it('apaga el botón y dice por qué cuando es el único libro', () => {
    conConsultas(<EliminarElLibro nombre="Personal" unico />)

    expect(screen.getByRole('button', { name: copy.borrar.open })).toBeDisabled()
    expect(screen.getByText(copy.borrar.lastBook)).toBeInTheDocument()
  })
})
