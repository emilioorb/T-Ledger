import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { generarToken, hashDelToken, type EnlaceDeInvitacion } from './registro.js'

// Los enlaces de invitación, del lado de la base. El token se muestra una sola vez, al crear el
// enlace: acá entra y sale el token en claro, pero a la base va solo su hash. Crear un enlace
// para una invitación borra los anteriores de esa invitación, así «copiar el enlace» siempre da
// uno que sirve y el que se había mandado antes deja de servir.
//
// Trabaja con el cliente sin filtro de libro: los enlaces se buscan antes de que exista una
// sesión, y la invitación a la app no pertenece a ningún libro.
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
      data: {
        tipo: 'APP',
        email: invitacion.email,
        expiresAt: invitacion.expiresAt,
        tokenHash: hashDelToken(token),
        accessInvitationId: invitacion.id,
      },
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

  // Aceptar una invitación a un libro exige el enlace de esa invitación, no solo el correo: el
  // correo no se verifica, y cualquiera con cuenta puede invitar a un correo ajeno a su propio
  // libro, sacar ese enlace y registrarse con él. Sirve aunque el enlace ya se haya gastado al
  // registrarse, porque aceptar es el paso siguiente de ese mismo registro.
  async abreLaInvitacion(token: string, bookInvitationId: string): Promise<boolean> {
    const enlace = await this.db.invitationLink.findFirst({
      where: { tokenHash: hashDelToken(token), bookInvitationId },
      select: { id: true },
    })
    return enlace !== null
  }

  // Se gasta el enlace que se usó, por su hash, y no las invitaciones de ese correo: con el
  // enlace de un libro no se gasta una invitación a la app que estaba aparte. Corre después de
  // crear la cuenta, así que no falla si el enlace ya no está (se renovó o se canceló en el
  // medio): la cuenta existe igual y tiene que nacer con su libro.
  async gastar(token: string): Promise<void> {
    const ahora = new Date()
    const tokenHash = hashDelToken(token)
    const { count } = await this.db.invitationLink.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: ahora },
    })
    if (count === 0) return
    const enlace = await this.db.invitationLink.findUnique({
      where: { tokenHash },
      select: { accessInvitationId: true },
    })
    if (enlace?.accessInvitationId) {
      await this.db.accessInvitation.updateMany({
        where: { id: enlace.accessInvitationId },
        data: { usedAt: ahora },
      })
    }
  }

  private async reemplazar(
    datos: { email: string; expiresAt: Date } & (
      | { tipo: 'APP'; accessInvitationId: string }
      | { tipo: 'LIBRO'; bookInvitationId: string }
    ),
  ): Promise<string> {
    const token = generarToken()
    const deLaInvitacion =
      datos.tipo === 'APP'
        ? { accessInvitationId: datos.accessInvitationId }
        : { bookInvitationId: datos.bookInvitationId }
    await this.db.$transaction([
      this.db.invitationLink.deleteMany({ where: deLaInvitacion }),
      this.db.invitationLink.create({
        data: {
          tipo: datos.tipo,
          email: datos.email,
          expiresAt: datos.expiresAt,
          tokenHash: hashDelToken(token),
          ...deLaInvitacion,
        },
      }),
    ])
    return token
  }
}
