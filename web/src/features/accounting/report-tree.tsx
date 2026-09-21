import { Amount } from './amount'
import { cn } from '@/lib/utils'
import type { ReportNode } from './types'

interface Props {
  nodes: ReportNode[]
  derivedCode?: string
  derivedHint?: string
}

const INDENT_PER_LEVEL = 16

const Row = ({ node, derivedCode, derivedHint }: { node: ReportNode } & Omit<Props, 'nodes'>) => {
  const isDerived = node.code === derivedCode

  return (
    <>
      <li
        className={cn(
          'flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-sm',
          node.level === 0 && 'font-medium',
        )}
      >
        <span
          className="min-w-0 truncate"
          style={{ paddingLeft: node.level * INDENT_PER_LEVEL }}
        >
          {!isDerived ? (
            <span className="num num-right mr-1.5 text-xs text-muted-foreground">{node.code}</span>
          ) : null}
          <span className={cn(isDerived && 'italic')}>{node.name}</span>
        </span>
        <Amount money={node.balance} emphasis={node.level === 0 ? 'strong' : 'normal'} />
      </li>

      {isDerived && derivedHint ? (
        <li className="border-b border-border py-1.5 text-xs text-muted-foreground">
          <span style={{ paddingLeft: (node.level + 1) * INDENT_PER_LEVEL }}>{derivedHint}</span>
        </li>
      ) : null}

      {node.children.map((child) => (
        <Row key={child.code} node={child} derivedCode={derivedCode} derivedHint={derivedHint} />
      ))}
    </>
  )
}

export const ReportTree = ({ nodes, derivedCode, derivedHint }: Props) => (
  <ul>
    {nodes.map((node) => (
      <Row key={node.code} node={node} derivedCode={derivedCode} derivedHint={derivedHint} />
    ))}
  </ul>
)
