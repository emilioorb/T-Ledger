import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { applyTheme, readTheme, type Theme } from '@/lib/theme'

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(next)}
      aria-label={next === 'light' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{next === 'light' ? 'Claro' : 'Oscuro'}</span>
    </Button>
  )
}
