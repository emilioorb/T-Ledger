import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  action?: ReactNode
}

export const EmptyState = ({ title, description, action }: Props) => (
  <div className="border-y border-border py-10">
    <h2 className="text-base font-medium tracking-tight">{title}</h2>
    <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
)
