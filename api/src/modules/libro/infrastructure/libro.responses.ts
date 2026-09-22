import { z } from 'zod'

// Cuánto se llevó el vaciado, por tabla. Sin él, la pantalla solo podría decir «listo», y un
// botón irreversible que contesta «listo» no se puede comprobar.
// Un libro de la persona, con lo que puede hacer adentro y desde cuándo existe. El rol es el
// dato que el listado de Better Auth no devuelve.
export const libroPropioResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    createdAt: z.string(),
  })
  .meta({ id: 'LibroPropio', title: 'LibroPropio' })

export const vaciadoResponseSchema = z
  .object({
    borrado: z.record(z.string(), z.number().int().nonnegative()),
    total: z.number().int().nonnegative(),
  })
  .meta({ id: 'Vaciado', title: 'Vaciado' })
