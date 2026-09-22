import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { Cambio } from '../domain/cambios.js'
import type {
  EntradaDeRastroResponse,
  ListarRastroQuery,
} from '../infrastructure/auditoria.schemas.js'

// Cada columna ordenable, con su desempate. El desempate no es opcional: dos entradas de la
// misma transacción comparten el instante, y sin un segundo criterio el orden entre ellas
// cambia de una consulta a otra y la paginación repite o se saltea filas.
const ORDEN = {
  cuando: (dir: 'asc' | 'desc') => [{ createdAt: dir }, { id: 'desc' as const }],
  quien: (dir: 'asc' | 'desc') => [
    { authuser: { name: dir } },
    { createdAt: 'desc' as const },
    { id: 'desc' as const },
  ],
  que: (dir: 'asc' | 'desc') => [
    { entity: dir },
    { action: dir },
    { createdAt: 'desc' as const },
    { id: 'desc' as const },
  ],
}

interface Pagina {
  items: EntradaDeRastroResponse[]
  totalItems: number
}

// Sin repositorio de por medio: acá no hay reglas de dominio que proteger, solo una lectura
// paginada de una tabla que se escribe en otro lado. Un puerto y un adaptador para esto serían
// dos archivos que no deciden nada.
@Injectable()
export class ListarRastroUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListarRastroQuery): Promise<Pagina> {
    const where = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      // La búsqueda mira dos lados, porque las dos preguntas que se le hacen al registro son
      // «¿qué tocó fulano?» y «¿qué pasó con esto?». El detalle se recorre como texto: es una
      // columna JSON y lo que hay adentro son los nombres de las cosas.
      ...(query.search
        ? {
            OR: [
              { authuser: { name: { contains: query.search, mode: 'insensitive' as const } } },
              { searchText: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where,
        orderBy: ORDEN[query.sort](query.direction),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        // El nombre viaja con la entrada: mostrar el identificador de la persona sería pedirle
        // a quien lee que adivine quién es.
        include: { authuser: { select: { id: true, name: true } } },
      }),
      this.prisma.client.auditLog.count({ where }),
    ])

    return {
      items: rows.map((row) => ({
        id: row.id,
        autor: row.authuser ? { id: row.authuser.id, nombre: row.authuser.name } : null,
        entity: row.entity,
        entityId: row.entityId,
        action: row.action,
        // La columna es JSON libre: lo que se guardó siempre fue una lista de cambios, pero el
        // tipo de Prisma no lo sabe y una fila vieja o escrita a mano podría no serlo.
        changes: Array.isArray(row.changes) ? (row.changes as unknown as Cambio[]) : [],
        createdAt: row.createdAt.toISOString(),
      })),
      totalItems,
    }
  }
}
