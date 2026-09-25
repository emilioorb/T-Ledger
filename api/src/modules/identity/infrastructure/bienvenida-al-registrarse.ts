import type { PrismaClient } from '../../../generated/prisma/client.js'

// Para aceptar la invitación a un libro hay que tener cuenta, así que el invitado primero se
// registra, cae en su libro «Personal» y ahí vería la bienvenida antes de poder aceptar. Si al
// registrarse ya lo esperan en un libro, viene a ese libro: la bienvenida no es para él.
export const marcarSiTieneInvitacion = async (
  prisma: PrismaClient,
  userId: string,
  email: string,
  ahora: Date,
): Promise<boolean> => {
  // Better Auth guarda el correo en minúsculas tanto al registrarse (`sign-up`) como al crear
  // la invitación al libro (`crud-invites`): se normaliza igual acá para que la comparación no
  // dependa de cómo haya llegado el correo a este gancho.
  const invitacion = await prisma.bookInvitation.findFirst({
    where: { email: email.toLowerCase(), status: 'pending', expiresAt: { gt: ahora } },
    select: { id: true },
  })
  if (!invitacion) return false
  await prisma.authUser.updateMany({
    where: { id: userId, bienvenidaVistaEn: null },
    data: { bienvenidaVistaEn: ahora },
  })
  return true
}
