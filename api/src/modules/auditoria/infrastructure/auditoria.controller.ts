import { Controller, Get, Query } from '@nestjs/common'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import { ListarRastroUseCase } from '../application/listar-rastro.use-case.js'
import {
  listarRastroQuerySchema,
  type EntradaDeRastroResponse,
  type ListarRastroQuery,
} from './auditoria.schemas.js'

@Controller('audit-log')
export class AuditoriaController {
  constructor(private readonly listarRastro: ListarRastroUseCase) {}

  // Solo el dueño. El registro dice quién tocó qué, y en un libro compartido eso es información
  // sobre las personas y no sobre la plata: quien administra a la gente es el mismo que puede
  // mirar lo que hizo. El permiso se declara acá y lo hace cumplir el guard, igual que en el
  // resto de la app —y hay un test que recorre los controladores para que ninguno se olvide—.
  @Get()
  @Permiso('auditoria', 'read')
  async list(
    @Query(new ZodValidationPipe(listarRastroQuerySchema)) query: ListarRastroQuery,
  ): Promise<Paginated<EntradaDeRastroResponse>> {
    const { items, totalItems } = await this.listarRastro.execute(query)
    return paginated(items, query.page, query.pageSize, totalItems)
  }
}
