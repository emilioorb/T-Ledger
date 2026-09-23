import { z } from 'zod'

export const soyAdminResponseSchema = z
  .object({ admin: z.boolean() })
  .meta({ id: 'SoyAdmin', title: 'SoyAdmin' })

export const invitarALaAppSchema = z
  .object({ email: z.email() })
  .meta({ id: 'InvitarALaAppInput', title: 'InvitarALaAppInput' })

export const invitacionALaAppResponseSchema = z
  .object({ id: z.string(), email: z.string(), expiresAt: z.string() })
  .meta({ id: 'InvitacionALaApp', title: 'InvitacionALaApp' })

export const resumenDeInstanciaResponseSchema = z
  .object({ usuarios: z.number().int().nonnegative() })
  .meta({ id: 'ResumenDeInstancia', title: 'ResumenDeInstancia' })
