import { z } from 'zod'

const bccrConfigSchema = z.object({
  BCCR_API_URL: z.url({ error: 'BCCR_API_URL debe ser una URL' }).default('https://apim.bccr.fi.cr'),
  BCCR_TOKEN: z.string().min(1, { error: 'BCCR_TOKEN es obligatorio' }),
})

export interface BccrConfig {
  readonly baseUrl: string
  readonly token: string
}

// Falla al arrancar y no en la primera sincronización: un token ausente tiene que ser
// ruidoso el día que se despliega, no tres semanas después con tasas viejas.
export const loadBccrConfig = (source: NodeJS.ProcessEnv): BccrConfig => {
  const result = bccrConfigSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Configuración del BCCR inválida:\n${z.prettifyError(result.error)}`)
  }
  return { baseUrl: result.data.BCCR_API_URL, token: result.data.BCCR_TOKEN }
}
