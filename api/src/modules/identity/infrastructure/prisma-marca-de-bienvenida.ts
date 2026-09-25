import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { MarcaDeBienvenida } from '../domain/marca-de-bienvenida.port.js'

// Sobre el cliente sin filtro de libro, como todo lo que toca tablas de Better Auth: la marca es
// de la persona, no de ningún libro.
export class PrismaMarcaDeBienvenida implements MarcaDeBienvenida {
  constructor(private readonly prisma: PrismaClient) {}

  async vista(userId: string): Promise<boolean> {
    const persona = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: { bienvenidaVistaEn: true },
    })
    return persona?.bienvenidaVistaEn != null
  }

  // `updateMany` y no `update`: con la condición sobre la marca, `update` tira cuando ya estaba
  // puesta, y marcar dos veces tiene que dar lo mismo.
  async marcar(userId: string): Promise<void> {
    await this.prisma.authUser.updateMany({
      where: { id: userId, bienvenidaVistaEn: null },
      data: { bienvenidaVistaEn: new Date() },
    })
  }
}
