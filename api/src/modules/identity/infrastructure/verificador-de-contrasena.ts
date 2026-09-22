import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { AUTH } from '../identity.tokens.js'
import type { Auth } from './auth.config.js'

// Comprueba que quien pide algo irreversible es quien dice ser.
//
// No compara hashes a mano: se lo pide al propio Better Auth, que es quien los escribió. Un
// `bcrypt.compare` acá funcionaría hoy y se rompería en silencio el día que cambie el
// algoritmo o sus parámetros, y el síntoma sería una contraseña correcta rechazada justo en
// la pantalla donde alguien está intentando algo urgente.
@Injectable()
export class VerificadorDeContrasena {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly prisma: PrismaService,
  ) {}

  async esLaDe(userId: string, contrasena: string): Promise<boolean> {
    // El cliente sin filtro de libro: las credenciales no pertenecen a ningún libro.
    const cuenta = await this.prisma.clientSinFiltroDeLibro.authAccount.findFirst({
      where: { userId, providerId: 'credential' },
      select: { password: true },
    })
    if (!cuenta?.password) return false

    const contexto = await this.auth.$context
    return contexto.password.verify({ hash: cuenta.password, password: contrasena })
  }
}
