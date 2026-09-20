import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          <Link to="/" className="text-sm font-medium tracking-tight">
            Finanzas
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </div>
  ),
})
