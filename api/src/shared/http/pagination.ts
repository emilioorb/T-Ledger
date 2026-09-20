import { z } from 'zod'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

export const paginated = <T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number,
): Paginated<T> => ({
  data,
  pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
})
