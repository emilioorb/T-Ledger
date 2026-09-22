import { z } from 'zod'
import { paginationQuerySchema } from '../../../shared/http/pagination.js'

// Los filtros que contestan las dos preguntas que se le hacen al registro: «¿qué pasó acá?»
// —una entidad puntual— y «¿qué tocó esta persona?».
export const listarRastroQuerySchema = paginationQuerySchema
  .extend({
    entity: z
      .enum(['movimiento', 'periodo', 'deuda', 'meta', 'inversion', 'presupuesto', 'miembro'])
      .optional(),
    entityId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    // El orden lo decide el servidor y no la pantalla: las entradas vienen paginadas, y
    // ordenar las veinticinco visibles diría «ordenado por quién» mientras miente sobre las
    // otras trescientas.
    // Texto libre. Busca en el nombre de quien hizo el cambio y dentro del detalle guardado,
    // que es donde están los nombres de las cosas: «Mercado», «Camera Fujifilm».
    search: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(['cuando', 'quien', 'que']).default('cuando'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  })
  .meta({ id: 'ListarRastroQuery', title: 'ListarRastroQuery' })

const cambioSchema = z
  .object({
    campo: z.string(),
    // Lo que había y lo que quedó, ya normalizados a algo que sobrevive al JSON. Sin forma
    // fija a propósito: cada entidad tiene los suyos, y un esquema cerrado obligaría a
    // declarar acá los campos de las siete.
    antes: z.unknown(),
    despues: z.unknown(),
  })
  .meta({ id: 'CambioDeRastro', title: 'CambioDeRastro' })

export const entradaDeRastroSchema = z
  .object({
    id: z.string(),
    // Quién lo hizo. Es `null` cuando la cuenta ya no existe: las entradas no se borran con la
    // persona, porque serían agujeros en la historia justo donde alguien querría mirar.
    autor: z.object({ id: z.string(), nombre: z.string() }).nullable(),
    entity: z.string(),
    entityId: z.string(),
    action: z.string(),
    changes: z.array(cambioSchema),
    createdAt: z.string(),
  })
  .meta({ id: 'EntradaDeRastro', title: 'EntradaDeRastro' })

export type ListarRastroQuery = z.infer<typeof listarRastroQuerySchema>
export type EntradaDeRastroResponse = z.infer<typeof entradaDeRastroSchema>
