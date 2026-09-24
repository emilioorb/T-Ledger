import { z } from 'zod'

// La versión que se leyó (6b). Opcional mientras haya clientes que no la mandan: sin ella se guarda
// como antes, y queda contado.
export const version = z.number().int().nonnegative()

// La misma cuando no hay cuerpo JSON: un campo de formulario al subir un archivo, o `?version=` al
// quitarlo o al borrar. Llega como texto.
export const versionEnTextoSchema = z
  .object({ version: z.string().regex(/^\d+$/).transform(Number) })
  .partial()
  .meta({ id: 'VersionEnTexto', title: 'VersionEnTexto' })

export type VersionEnTexto = z.infer<typeof versionEnTextoSchema>
