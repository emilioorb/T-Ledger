import { z } from 'zod'

// La versión que se leyó (6b). Opcional mientras haya clientes que no la mandan: sin ella se guarda
// como antes, y queda contado.
// Con el tope de la columna (INTEGER): una más grande no es una versión, y llegaba a la base.
export const version = z.number().int().nonnegative().max(2_147_483_647)

// La misma cuando no hay cuerpo JSON: un campo de formulario al subir un archivo, o `?version=` al
// quitarlo o al borrar. Llega como texto.
export const versionEnTextoSchema = z
  .object({ version: z.string().regex(/^\d{1,9}$/).transform(Number) })
  .partial()
  .meta({ id: 'VersionEnTexto', title: 'VersionEnTexto' })

export type VersionEnTexto = z.infer<typeof versionEnTextoSchema>
