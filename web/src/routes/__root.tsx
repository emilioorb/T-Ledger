import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/sonner'
import { copy } from '@/features/debts/copy'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          <div className="flex items-baseline gap-5">
            <Link to="/" className="inline-flex min-h-6 items-center text-sm font-semibold tracking-tight">
              Finanzas
            </Link>
            <Link
              to="/deudas"
              className="inline-flex min-h-6 items-center text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {copy.nav.debts}
            </Link>
            <Link
              to="/plan-de-pago"
              className="inline-flex min-h-6 items-center text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {copy.nav.payoffPlan}
            </Link>
          </div>
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
