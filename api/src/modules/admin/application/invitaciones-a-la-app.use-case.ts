import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { EnlacesDeInvitacion } from '../../identity/infrastructure/enlaces-de-invitacion.js'

export interface InvitacionALaApp {
  id: string
  email: string
  expiresAt: Date
}

// Al invitar, y solo ahí, viene el token del enlace: en la base queda su hash, así que después
// no se puede volver a mostrar. Para mandarlo otra vez se renueva.
export interface InvitacionConEnlace extends InvitacionALaApp {
  token: string
}

// Una semana: alcanza para que la persona lea el mensaje y se registre, y no deja abierta
// indefinidamente una puerta que alguien pidió hace meses.
const VIGENCIA_EN_DIAS = 7

const SELECCION = { id: true, email: true, expiresAt: true } as const

// Las invitaciones a la app las maneja quien administra la instancia: invitar a quien pidió
// acceso, ver las que siguen esperando y cancelar la que ya no corresponde. Van contra el
// cliente sin filtro de libro porque no pertenecen a ninguno.
@Injectable()
export class InvitacionesALaAppUseCase {
  private readonly logger = new Logger(InvitacionesALaAppUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly enlaces: EnlacesDeInvitacion,
  ) {}

  private get db() {
    return this.prisma.clientSinFiltroDeLibro
  }

  async invitar(email: string, createdBy: string): Promise<InvitacionConEnlace> {
    const correo = email.trim().toLowerCase()
    if (await this.db.authUser.findUnique({ where: { email: correo }, select: { id: true } })) {
      throw new ConflictException('Ese correo ya tiene cuenta.')
    }

    const expiresAt = new Date(Date.now() + VIGENCIA_EN_DIAS * 86_400_000)
    // Volver a invitar renueva: la anterior sin usar se reemplaza, así el enlace que se manda
    // es siempre el de una invitación vigente y la lista no se llena de repetidos.
    const conEnlace = await this.db.$transaction(async (tx) => {
      await tx.accessInvitation.deleteMany({ where: { email: correo, usedAt: null } })
      const invitacion = await tx.accessInvitation.create({
        data: { email: correo, expiresAt, createdBy },
        select: SELECCION,
      })
      return { ...invitacion, token: await this.enlaces.paraUnaInvitacionNueva(tx, invitacion) }
    })

    // Al log el hecho y no el correo: el ADR-005 no deja datos de personas en la telemetría.
    this.logger.log('La administración invitó a alguien a la app')
    return conEnlace
  }

  // Un enlace nuevo para una invitación que sigue esperando. El anterior deja de servir: es la
  // forma de volver a mandarlo, porque el token no se guarda.
  async renovarEnlace(id: string): Promise<string> {
    const vigente = await this.db.accessInvitation.findFirst({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    if (!vigente) throw new NotFoundException('Esa invitación no existe o ya se usó.')
    return this.enlaces.paraLaApp(vigente.id)
  }

  pendientes(): Promise<InvitacionALaApp[]> {
    return this.db.accessInvitation.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: SELECCION,
    })
  }

  async cancelar(id: string): Promise<void> {
    const { count } = await this.db.accessInvitation.deleteMany({ where: { id, usedAt: null } })
    if (count === 0) throw new NotFoundException('Esa invitación no existe o ya se usó.')
  }
}
