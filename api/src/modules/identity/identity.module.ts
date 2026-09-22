import { Global, MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { loadEnv } from '../../shared/config/env.js'
import { conLibro } from '../../shared/libro/libro-context.js'
import { PrismaService } from '../../shared/prisma/prisma.service.js'
import { RASTRO, type Rastro } from '../auditoria/domain/rastro.port.js'
import { RastroModule } from '../auditoria/rastro.module.js'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { AUTH, LIBRO_CREADO } from './identity.tokens.js'
import { crearAuth, type Auth } from './infrastructure/auth.config.js'
import { LibroMiddleware } from './infrastructure/libro.middleware.js'
import { PermisoGuard } from './infrastructure/permiso.guard.js'

// Global porque el middleware del libro corre sobre todas las rutas y la guardia de permiso se
// registra una vez para toda la aplicación: son infraestructura transversal, no un servicio
// que un módulo pide.
@Global()
@Module({
  imports: [RastroModule],
  providers: [
    {
      provide: AUTH,
      inject: [PrismaService, EventEmitter2, RASTRO],
      // El cliente crudo, sin el filtro de libro: las tablas de Better Auth no pertenecen a
      // ningún libro y pasarlas por el filtro sería pedirle la llave al portero.
      useFactory: (prisma: PrismaService, eventos: EventEmitter2, rastro: Rastro): Auth =>
        // Se avisa que nació un libro y nada más. Quién quiera prepararle algo —hoy el plan
        // de cuentas, mañana lo que sea— se suscribe. Si identidad importara el caso de uso
        // de contabilidad, el módulo que sabe de sesiones tendría que saber también qué es un
        // plan de cuentas, y esa dependencia va al revés.
        crearAuth(
          prisma.clientSinFiltroDeLibro,
          loadEnv(process.env),
          async (bookId) => {
            await eventos.emitAsync(LIBRO_CREADO, { bookId })
          },
          // El libro y el autor vienen del gancho, no del contexto de la petición. Dentro de
          // los manejadores de Better Auth ese contexto no llega —probado: el rastro salió
          // firmado por la persona equivocada—, y el gancho sí sabe quién invitó, quién
          // canceló y quién aceptó.
          async ({ bookId, aQuien, autorId, accion, antes, despues }) => {
            await conLibro({ bookId, userId: autorId, rol: 'owner' }, () =>
              rastro.registrar({
                entidad: 'miembro',
                entidadId: aQuien,
                accion,
                ...(antes ? { antes } : {}),
                ...(despues ? { despues } : {}),
              }),
            )
          },
        ),
    },
    LibroMiddleware,
    { provide: APP_GUARD, useClass: PermisoGuard },
  ],
  exports: [AUTH],
})
export class IdentityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Sobre todo: el middleware sale temprano si no hay sesión, así que las rutas públicas no
    // pagan nada, y ninguna ruta del libro puede quedarse afuera por olvido.
    consumer.apply(LibroMiddleware).forRoutes('*')
  }
}
