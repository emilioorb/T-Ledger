import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { generarToken, hashDelToken, type EnlaceDeInvitacion } from './registro.js'

// Los enlaces de invitación, del lado de la base. El token se muestra una sola vez, al crear el
// enlace: acá entra y sale el token en claro, pero a la base va solo su hash. Crear un enlace
// para una invitación borra los anteriores de esa invitación, así «copiar el enlace» siempre da
// uno que sirve y el que se había mandado antes deja de servir.
//
// Trabaja con el cliente sin filtro de libro: los enlaces se buscan antes de que exista una
// sesión, y la invitación a la app no pertenece a ningún libro.
type DeLaInvitacion = { tipo: 'APP'; accessInvitationId: string } | { tipo: 'LIBRO'; bookInvitationId: string }

const relacionCon = (invitacion: DeLaInvitacion) =>
  invitacion.tipo === 'APP'
    ? { accessInvitationId: invitacion.accessInvitationId }
    : { bookInvitationId: invitacion.bookInvitationId }

// Lo que lleva un enlace, en un solo lugar: el token en claro no, su hash sí.
const datosDelEnlace = (token: string, invitacion: { email: string; expiresAt: Date } & DeLaInvitacion) => ({
  tipo: invitacion.tipo,
  email: invitacion.email,
  expiresAt: invitacion.expiresAt,
  tokenHash: hashDelToken(token),
  ...relacionCon(invitacion),
})

export class EnlacesDeInvitacion {
  constructor(private readonly db: PrismaClient) {}

  async paraLaApp(accessInvitationId: string): Promise<string> {
    const invitacion = await this.db.accessInvitation.findUniqueOrThrow({
      where: { id: accessInvitationId },
      select: { email: true, expiresAt: true },
    })
    return this.reemplazar({ tipo: 'APP', accessInvitationId, ...invitacion })
  }

  // Para una invitación a la app que se está creando, dentro de su misma transacción: si algo
  // falla en el medio no queda una invitación sin enlace.
  async paraUnaInvitacionNueva(
    tx: Prisma.TransactionClient,
    invitacion: { id: string; email: string; expiresAt: Date },
  ): Promise<string> {
    const token = generarToken()
    await tx.invitationLink.create({
      data: datosDelEnlace(token, { ...invitacion, tipo: 'APP', accessInvitationId: invitacion.id }),
    })
    return token
  }

  // Solo para una invitación pendiente y vigente del libro en el que se está: el id de una
  // invitación ajena no alcanza para sacarle un enlace, y el de una vencida daría uno que no
  // sirve. Sin invitación que coincida, `null`.
  async paraUnLibro(bookInvitationId: string, bookId: string): Promise<string | null> {
    const invitacion = await this.db.bookInvitation.findFirst({
      where: { id: bookInvitationId, organizationId: bookId, status: 'pending', expiresAt: { gt: new Date() } },
      select: { email: true, expiresAt: true },
    })
    return invitacion ? this.reemplazar({ tipo: 'LIBRO', bookInvitationId, ...invitacion }) : null
  }

  async buscar(token: string): Promise<EnlaceDeInvitacion | null> {
    const enlace = await this.db.invitationLink.findUnique({
      where: { tokenHash: hashDelToken(token) },
      select: {
        tipo: true,
        email: true,
        expiresAt: true,
        usedAt: true,
        accessInvitation: { select: { usedAt: true, expiresAt: true } },
        bookInvitation: { select: { status: true, expiresAt: true } },
      },
    })
    if (!enlace) return null
    const ahora = new Date()
    const invitacionVigente = enlace.accessInvitation
      ? enlace.accessInvitation.usedAt === null && enlace.accessInvitation.expiresAt > ahora
      : enlace.bookInvitation?.status === 'pending' && enlace.bookInvitation.expiresAt > ahora
    return { tipo: enlace.tipo, email: enlace.email, expiresAt: enlace.expiresAt, usedAt: enlace.usedAt, invitacionVigente }
  }

  // Aceptar o rechazar una invitación a un libro exige el enlace de esa invitación, no solo el
  // correo: el correo no se verifica. El enlace de un libro no se gasta al usarlo; lo que hace
  // que sirva una sola vez es la invitación, que Better Auth pasa a aceptada o rechazada.
  async abreLaInvitacion(token: string, bookInvitationId: string): Promise<boolean> {
    const enlace = await this.db.invitationLink.findFirst({
      where: { tokenHash: hashDelToken(token), tipo: 'LIBRO', bookInvitationId },
      select: { id: true },
    })
    return enlace !== null
  }

  // Después de crear la cuenta: se gasta el enlace que se usó, por su hash, y se cierra la
  // invitación a la app de ese correo, que ya tiene cuenta. No falla si el enlace ya no está
  // (se renovó o se canceló en el medio): la cuenta existe igual y tiene que nacer con su libro,
  // y su invitación no puede quedar como pendiente.
  async gastar(token: string, email: string): Promise<void> {
    const ahora = new Date()
    await this.db.invitationLink.updateMany({
      where: { tokenHash: hashDelToken(token), usedAt: null },
      data: { usedAt: ahora },
    })
    await this.db.accessInvitation.updateMany({
      where: { email: email.trim().toLowerCase(), usedAt: null },
      data: { usedAt: ahora },
    })
  }

  private async reemplazar(invitacion: { email: string; expiresAt: Date } & DeLaInvitacion): Promise<string> {
    const token = generarToken()
    await this.db.$transaction([
      this.db.invitationLink.deleteMany({ where: relacionCon(invitacion) }),
      this.db.invitationLink.create({ data: datosDelEnlace(token, invitacion) }),
    ])
    return token
  }
}
