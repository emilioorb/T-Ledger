import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import {
  MOVEMENT_REPOSITORY,
  type CategoryTotal,
  type MovementFilters,
  type MovementRepository,
} from '../domain/movement-repository.port.js'
import type { PostedMovement } from './create-movement.use-case.js'
import { MovementPoster } from './movement-poster.js'

export interface PostedMovementPage {
  readonly items: PostedMovement[]
  readonly totalItems: number
}

@Injectable()
export class ListMovementsUseCase {
  constructor(
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly poster: MovementPoster,
  ) {}

  async execute(
    filters: MovementFilters,
    page: number,
    pageSize: number,
  ): Promise<PostedMovementPage> {
    const { items, totalItems } = await this.movements.findAll(filters, page, pageSize)

    const posted = await Promise.all(
      items.map(async (movement) => ({
        movement,
        journalEntryId: await this.poster.activeEntryIdOf(movement.id),
      })),
    )

    return { items: posted, totalItems }
  }

  // De mayor a menor, que es el orden en que se lee una composición: lo que más pesa
  // primero. Ordenar acá y no en el cliente evita que dos pantallas lo hagan distinto.
  async totalsByCategory(filters: MovementFilters): Promise<CategoryTotal[]> {
    const totals = await this.movements.totalsByCategory(filters)
    return [...totals].sort((a, b) => Number(b.total.minorUnits - a.total.minorUnits))
  }

  async byId(id: string): Promise<PostedMovement> {
    const movement = await this.movements.findById(id)
    if (!movement) throw new NotFoundError(`El movimiento ${id} no existe.`)
    return { movement, journalEntryId: await this.poster.activeEntryIdOf(id) }
  }
}
