import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountsTree } from './accounts-tree'
import { copy } from './copy'
import type { ReportNode } from './types'

const saldo = { minorUnits: '0', currency: 'CRC' as const }
const nodo = (code: string, name: string, level: number, children: ReportNode[] = []): ReportNode => ({
  code,
  name,
  balance: saldo,
  level,
  children,
})

const filaDe = (nombre: string) => screen.getByText(nombre).closest('li')

describe('AccountsTree', () => {
  it('pinta como grupo a las raíces aunque no tengan cuentas debajo, y a las que tienen hijas', () => {
    render(
      <AccountsTree
        nodes={[
          nodo('1000', 'Activos', 0, [nodo('1100', 'Efectivo', 1, [nodo('1101', 'Caja', 2)])]),
          nodo('5000', 'Costo de ingresos', 0),
        ]}
        accounts={[]}
        onEdit={vi.fn()}
      />,
    )

    expect(filaDe('Costo de ingresos')).toHaveClass('bg-muted/60')
    expect(filaDe('Efectivo')).toHaveClass('bg-muted/60')
    expect(filaDe('Caja')).not.toHaveClass('bg-muted/60')
    expect(screen.getAllByText(copy.accounts.grouping)).toHaveLength(3)
  })
})
