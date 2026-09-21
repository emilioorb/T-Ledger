import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FRAME_ROW } from '@/components/table-frame'
import { cn } from '@/lib/utils'
import { Amount } from './amount'
import { copy } from './copy'
import type { Account, ReportNode } from './types'

interface Props {
  nodes: ReportNode[]
  accounts: Account[]
  onEdit: (account: Account) => void
}

const INDENT_PER_LEVEL = 18

interface RowProps {
  node: ReportNode
  byCode: Map<string, Account>
  expanded: Set<string>
  onToggle: (code: string) => void
  onEdit: (account: Account) => void
}

const AccountRow = ({ node, byCode, expanded, onToggle, onEdit }: RowProps) => {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.code)
  const account = byCode.get(node.code)

  return (
    <>
      <li
        className={cn(
          `group grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border ${FRAME_ROW}`,
          // La raíz se marca con una línea más fuerte, no con más alto: todas las filas
          // miden lo mismo y la jerarquía se lee por sangría y peso.
          node.level === 0 && 'border-border-strong',
        )}
      >
        <div
          className="flex min-w-0 items-center gap-1.5"
          style={{ paddingLeft: node.level * INDENT_PER_LEVEL }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.code)}
              aria-expanded={isOpen}
              aria-label={copy.accounts.expand(node.name)}
              className="-ml-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground pointer-coarse:size-8"
            >
              <ChevronRight
                className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="inline-block w-5 pointer-coarse:w-7" aria-hidden="true" />
          )}

          <span className="num num-right shrink-0 text-xs text-muted-foreground">{node.code}</span>
          <span
            className={cn(
              'truncate text-sm',
              node.level === 0 ? 'font-medium tracking-tight' : 'text-foreground',
              account?.active === false && 'text-muted-foreground line-through',
            )}
          >
            {node.name}
          </span>

          {hasChildren ? (
            <span className="hidden shrink-0 text-[0.6875rem] text-muted-foreground sm:inline">
              {copy.accounts.grouping}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {account ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label={copy.accounts.edit(node.name)}
              onClick={() => onEdit(account)}
            >
              {copy.accounts.editShort}
            </Button>
          ) : null}
          <Amount
            money={node.balance}
            emphasis={node.level === 0 ? 'strong' : 'normal'}
            className="w-24 text-sm sm:w-32"
          />
        </div>
      </li>

      {isOpen
        ? node.children.map((child) => (
            <AccountRow
              key={child.code}
              node={child}
              byCode={byCode}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))
        : null}
    </>
  )
}

// El árbol es la composición de esta vista: la jerarquía se lee por sangría y por el
// peso de la raíz, no por columnas repetidas.
export const AccountsTree = ({ nodes, accounts, onEdit }: Props) => {
  // Abierto hasta el segundo nivel: ver «Efectivo y equivalentes» sin ver «Caja colones»
  // esconde justamente las cuentas donde se asienta.
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set([
        ...nodes.map((node) => node.code),
        ...nodes.flatMap((node) => node.children.map((child) => child.code)),
      ]),
  )

  const toggle = (code: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(code)) next.add(code)
      return next
    })

  const byCode = new Map(accounts.map((account) => [account.code, account]))

  // El borde va por fila y no con `divide-y`: la raíz se marca con una línea más fuerte, y
  // el selector de `divide-y` le gana en especificidad al color de la fila.
  return (
    <ul className="[&>li:last-child]:border-b-0">
      {nodes.map((node) => (
        <AccountRow
          key={node.code}
          node={node}
          byCode={byCode}
          expanded={expanded}
          onToggle={toggle}
          onEdit={onEdit}
        />
      ))}
    </ul>
  )
}
