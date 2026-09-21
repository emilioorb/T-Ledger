import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { copy } from './copy'
import { DESTINATIONS } from './destinations'
import { usePrimaryActionValue } from './primary-action'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const Key = ({ children }: { children: string }) => (
  <kbd className="num rounded border border-border-strong px-1.5 py-0.5 text-xs">{children}</kbd>
)

const Row = ({ keys, label }: { keys: string[]; label: string }) => (
  <li className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm">
    <span>{label}</span>
    <span className="flex shrink-0 items-baseline gap-1">
      {keys.map((key) => (
        <Key key={key}>{key}</Key>
      ))}
    </span>
  </li>
)

export const ShortcutsSheet = ({ open, onOpenChange }: Props) => {
  const primary = usePrimaryActionValue()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{copy.shortcuts.title}</SheetTitle>
          <SheetDescription>{copy.shortcuts.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div>
            <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
              {copy.shortcuts.groups.navigation}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.shortcuts.prefixHint}</p>
            <ul className="mt-2">
              {DESTINATIONS.map((destination) => (
                <Row
                  key={destination.key}
                  keys={['g', destination.key]}
                  label={destination.label}
                />
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
              {copy.shortcuts.groups.actions}
            </h3>
            <ul className="mt-2">
              {primary ? (
                <Row keys={[copy.shortcuts.keys.primary]} label={primary.label} />
              ) : (
                <li className="border-b border-border py-2 text-sm text-muted-foreground">
                  {copy.shortcuts.noAction}
                </li>
              )}
              <Row keys={[copy.shortcuts.keys.help]} label={copy.shortcuts.help} />
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
