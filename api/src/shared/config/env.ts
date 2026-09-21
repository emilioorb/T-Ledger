import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL es obligatoria' }),
  PORT: z.coerce.number({ error: 'PORT debe ser un número' }).int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Opcional a propósito: sin DSN la app arranca y no reporta. Quedarse sin servicio porque
  // falta la telemetría sería cambiar un problema chico por uno grande.
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  // Obligatoria, al revés que el DSN de Sentry: sin telemetría la app funciona, pero una
  // sesión firmada con un secreto ausente o adivinable no es una sesión. El mínimo de 32 es
  // el que pide Better Auth para su derivación de claves.
  AUTH_SECRET: z.string().min(32, { error: 'AUTH_SECRET tiene que medir al menos 32 caracteres' }),
  AUTH_BASE_URL: z.string().default('http://localhost:3000'),
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
