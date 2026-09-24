import { CanActivate, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { loadEnv } from '../../../shared/config/env.js'
import { AUTH } from '../../identity/identity.tokens.js'
import type { Auth } from '../../identity/infrastructure/auth.config.js'
import { esAdmin, leerAdmins } from '../domain/admin.js'

// Deja pasar solo a quien administra la instancia. No mira el libro ni el rol adentro de él:
// son dos permisos distintos, y el dueño de su propio libro no tiene por qué ver cuánta
// gente usa el servidor.
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly admins = leerAdmins(loadEnv(process.env).ADMIN_USER_IDS)

  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<Request>()
    const sesion = await this.auth.api.getSession({ headers: fromNodeHeaders(peticion.headers) })

    if (!esAdmin(sesion?.user?.id, this.admins)) {
      // 403 y no 404: quien pregunta tiene sesión, así que sabe que la aplicación existe. Lo
      // que no sabe —y sigue sin saber— es qué hay del otro lado.
      throw new ForbiddenException('Esto es de la administración de la instancia.')
    }
    return true
  }

  // Para el endpoint que contesta «¿soy administrador?», que responde a todos.
  async loEs(peticion: Request): Promise<boolean> {
    const sesion = await this.auth.api.getSession({ headers: fromNodeHeaders(peticion.headers) })
    return esAdmin(sesion?.user?.id, this.admins)
  }
}
