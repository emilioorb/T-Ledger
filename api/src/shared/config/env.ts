import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL es obligatoria' }),
  PORT: z.coerce.number({ error: 'PORT debe ser un número' }).int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Opcional a propósito: sin DSN la app arranca y no reporta. Quedarse sin servicio porque
  // falta la telemetría sería cambiar un problema chico por uno grande.
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
})

export type Env = z.infer<typeof envSchema>

// Falla al arrancar, no en la primera petición: una credencial ausente tiene que ser
// un error de arranque ruidoso, no un 500 silencioso tres horas después.
export const loadEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
