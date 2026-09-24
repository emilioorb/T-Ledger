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

// Solo al invitar viene el token del enlace: en la base queda su hash y no se puede volver a
// mostrar. Para mandarlo otra vez se renueva.
export const invitacionConEnlaceResponseSchema = invitacionALaAppResponseSchema
  .extend({ token: z.string() })
  .meta({ id: 'InvitacionALaAppConEnlace', title: 'InvitacionALaAppConEnlace' })

export const enlaceDeInvitacionResponseSchema = z
  .object({ token: z.string() })
  .meta({ id: 'EnlaceDeInvitacion', title: 'EnlaceDeInvitacion' })

export const resumenDeInstanciaResponseSchema = z
  .object({ usuarios: z.number().int().nonnegative() })
  .meta({ id: 'ResumenDeInstancia', title: 'ResumenDeInstancia' })
