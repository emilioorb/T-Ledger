import { z } from 'zod'

// La contraseña y no el nombre del libro escrito a mano. Escribir el nombre demuestra que se
// leyó el diálogo; la contraseña demuestra que quien está del otro lado es el dueño, que es
// lo que hay que comprobar antes de borrar la contabilidad de alguien.
export const vaciarLibroSchema = z
  .object({ password: z.string().min(1, { error: 'Hace falta tu contraseña.' }) })
  .meta({ id: 'VaciarLibro', title: 'VaciarLibro' })

export type VaciarLibroInput = z.infer<typeof vaciarLibroSchema>
