import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import type { Category } from '../domain/category.js'
import type { Movement } from '../domain/movement.js'
import { activeEntriesOf, postingFor } from '../domain/movement-posting.js'

@Injectable()
export class MovementPoster {
  constructor(
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  // Un movimiento no contabilizable no es un error: devuelve null y queda registrado
  // sin asiento, a la espera de que su categoría reciba una cuenta.
  async post(movement: Movement, category: Category): Promise<string | null> {
    const chart = await this.accounts.loadChart()
    const entry = postingFor(movement, category, chart, randomUUID())
    if (isErr(entry)) throw new SemanticValidationError(entry.error.message)
    if (!entry.value) return null

    await this.journal.save(entry.value)
    return entry.value.id
  }

  // Anular no borra: se registra el espejo con la fecha del asiento original, para que
  // los dos queden en el mismo período y el mayor muestre la historia completa.
  async reverse(movementId: string): Promise<void> {
    const entries = await this.journal.findByMovementId(movementId)
    for (const entry of activeEntriesOf(entries)) {
      await this.journal.save(entry.reverse(randomUUID(), entry.date))
    }
  }

  async activeEntryIdOf(movementId: string): Promise<string | null> {
    const entries = await this.journal.findByMovementId(movementId)
    return activeEntriesOf(entries)[0]?.id ?? null
  }
}
