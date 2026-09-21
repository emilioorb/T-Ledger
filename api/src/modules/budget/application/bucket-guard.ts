import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import {
  BUDGET_MODEL_REPOSITORY,
  type BudgetModelRepository,
} from '../domain/budget-model-repository.port.js'

// Una deuda que dice pertenecer a una cubeta que no existe se guarda igual y después no
// aparece en ningún lado. Si todavía no hay modelo activo no hay contra qué comparar, y
// obligar a armar el presupuesto antes de anotar la primera deuda sería peor.
@Injectable()
export class BucketGuard {
  constructor(@Inject(BUDGET_MODEL_REPOSITORY) private readonly models: BudgetModelRepository) {}

  async assertExists(bucketId: string | null): Promise<void> {
    if (bucketId === null) return

    const active = await this.models.findActive()
    if (!active) return

    if (!active.buckets.some((bucket) => bucket.id === bucketId)) {
      const names = active.buckets.map((bucket) => bucket.id).join(', ')
      throw new SemanticValidationError(
        `La cubeta «${bucketId}» no existe en el presupuesto activo. Las que hay son: ${names}.`,
      )
    }
  }
}
