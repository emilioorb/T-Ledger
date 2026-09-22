import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { Prisma } from '../../../generated/prisma/client.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { calcularCambios } from '../domain/cambios.js'
import type { EntradaDeRastro, Rastro } from '../domain/rastro.port.js'

@Injectable()
export class PrismaRastroRepository implements Rastro {
  constructor(private readonly prisma: PrismaService) {}

  async registrar({ entidad, entidadId, accion, antes, despues }: EntradaDeRastro): Promise<void> {
    // Quién y en qué libro salen del contexto de la petición, no de los parámetros: si cada
    // llamador tuviera que pasarlos, el día que alguien se olvide el rastro diría que el
    // cambio lo hizo nadie.
    const { bookId, userId } = libroActual('auditoría')
    const cambios = calcularCambios(antes ?? {}, despues ?? {})

    // El mismo detalle en texto, para que la búsqueda pueda encontrarlo. Se arma acá y no al
    // consultar porque una columna de texto se indexa y un JSON convertido en cada consulta
    // no.
    const buscable = cambios
      .map(({ campo, antes: previo, despues: nuevo }) => `${campo} ${previo ?? ''} ${nuevo ?? ''}`)
      .join(' ')
      .trim()

    await this.prisma.client.auditLog.create({
      data: {
        id: randomUUID(),
        bookId,
        userId,
        entity: entidad,
        entityId: entidadId,
        action: accion,
        // Sin campos que mostrar, la columna queda en `null` y no en una lista vacía: un
        // cierre de mes o una anulación no cambian ningún campo, y un `[]` haría creer que se
        // buscó y no se encontró nada. Va como propiedad ausente y no como `undefined`
        // explícito porque el proyecto compila con `exactOptionalPropertyTypes`.
        //
        // El cast es el precio de que `Cambio` lleve `unknown`: `normalizar` ya dejó adentro
        // solo lo que sobrevive a JSON —los `BigInt` salieron convertidos a texto—, pero el
        // tipo no lo puede demostrar.
        ...(cambios.length > 0 ? { changes: cambios as unknown as Prisma.InputJsonValue } : {}),
        ...(buscable ? { searchText: buscable } : {}),
      },
    })
  }
}
