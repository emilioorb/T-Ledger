import { z } from 'zod'

export const soyAdminResponseSchema = z
  .object({ admin: z.boolean() })
  .meta({ id: 'SoyAdmin', title: 'SoyAdmin' })

export const resumenDeInstanciaResponseSchema = z
  .object({ usuarios: z.number().int().nonnegative() })
  .meta({ id: 'ResumenDeInstancia', title: 'ResumenDeInstancia' })
