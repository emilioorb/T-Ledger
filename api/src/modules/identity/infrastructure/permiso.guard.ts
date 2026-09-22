import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { libroActualSiHay } from '../../../shared/libro/libro-context.js'
import { puede, type Recurso } from './permisos.js'

const CLAVE = 'permiso-del-libro'

export interface PermisoPedido {
  recurso: Recurso
  accion: string
}

// Va sobre cada endpoint que escribe: `@Permiso('movimiento', 'create')`. Explícito a
// propósito. La guía de control de acceso pide que la autorización se lea en el endpoint, no
// que la deduzca una capa: un endpoint sin este decorador tiene que verse vacío al leerlo, y
// para eso está el test que recorre los controladores y falla si falta.
export const Permiso = (recurso: Recurso, accion: string) =>
  SetMetadata(CLAVE, { recurso, accion } satisfies PermisoPedido)

@Injectable()
export class PermisoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const pedido = this.reflector.getAllAndOverride<PermisoPedido | undefined>(CLAVE, [
      contexto.getHandler(),
      contexto.getClass(),
    ])
    // Sin decorador no hay nada que chequear acá. Que un endpoint de escritura no lo tenga es
    // un error, pero lo caza el test de cobertura y no una excepción en producción.
    if (!pedido) return true

    // Esta guardia corre antes que la de sesión de Better Auth, y el contexto de libro solo lo
    // abre el middleware cuando hay sesión. Sin contexto, entonces, lo que falta es la sesión:
    // es un 401, no un error del servidor.
    const libro = libroActualSiHay()
    if (!libro) throw new UnauthorizedException()

    if (!puede(libro.rol, pedido.recurso, pedido.accion)) {
      throw new ForbiddenException(
        `Tu rol en este libro no permite ${pedido.accion} ${pedido.recurso}`,
      )
    }
    return true
  }
}
