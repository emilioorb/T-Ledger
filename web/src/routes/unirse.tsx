import { createFileRoute } from '@tanstack/react-router'
import { Unirse } from '@/features/identity/unirse'

export const Route = createFileRoute('/unirse')({
  component: Unirse,
  // El id de la invitación viaja en la búsqueda; el token, en el fragmento.
  validateSearch: (busqueda: Record<string, unknown>): { invitacion?: string } =>
    typeof busqueda.invitacion === 'string' ? { invitacion: busqueda.invitacion } : {},
})
