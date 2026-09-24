import { z } from 'zod'

// Los cuatro datos de R2, opcionales y juntos: o están los cuatro y los comprobantes viven en
// el bucket, o falta alguno y viven en el disco de esta máquina. Medio configurado no existe,
// porque un cliente de S3 sin bucket falla recién al subir el primer archivo.
//
// Van aparte porque el módulo de archivos no necesita la base ni el secreto de sesión: si les
// pidiera el entorno entero, montarlo en un test obligaría a inventar una `DATABASE_URL`.
const archivosFields = {
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  // Dónde caen los archivos mientras no haya R2. Relativo a donde corre la API.
  ARCHIVOS_DIR: z.string().default('.archivos'),
  // Solo para decidir si el disco es aceptable: únicamente en `development` o `test`.
  NODE_ENV: z.string().optional(),
}

const archivosSchema = z.object(archivosFields)

export type EnvDeArchivos = z.infer<typeof archivosSchema>

export const loadArchivosEnv = (source: NodeJS.ProcessEnv): EnvDeArchivos =>
  archivosSchema.parse(source)

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
  // El secreto que Vercel agrega a lo que reenvía (web/vercel.json). Con él puesto, la API
  // rechaza todo lo que llega directo a Railway. Opcional: en local no hay proxy adelante.
  PROXY_SECRET: z.string().min(32, { error: 'PROXY_SECRET tiene que medir al menos 32 caracteres' }).optional(),
  // Quién administra la **instancia**: ids de usuario separados por comas. No es el dueño de
  // un libro: es quien ve los números del servidor entero y habilita cuentas. Va en el entorno
  // y no en la base a propósito: un superusuario que se pueda crear desde una pantalla es un
  // superusuario que alguien puede conseguir.
  ADMIN_USER_IDS: z.string().optional(),
  ...archivosFields,
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
