import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold tracking-tight">Finanzas</h1>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Deudas, préstamos y el plan de pago, calculados en el servidor.
      </p>
    </section>
  ),
})
