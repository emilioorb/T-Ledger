import { Inject, Injectable } from '@nestjs/common'
import type { PeriodKey } from '../domain/accounting-period.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import { blockersFor, type CloseBlocker, type PeriodSnapshot } from '../domain/period-closing.js'
import { PeriodSnapshots } from './period-snapshots.js'

export interface PeriodSummary {
  readonly snapshot: PeriodSnapshot
  readonly blockers: CloseBlocker[]
}

@Injectable()
export class ListPeriodsUseCase {
  constructor(
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly snapshots: PeriodSnapshots,
  ) {}

  // Solo los meses con actividad: la lista es el historial del libro, no un calendario.
  async execute(): Promise<PeriodSummary[]> {
    const [withEntries, withMovements] = await Promise.all([
      this.journal.monthsWithEntries(),
      this.movements.monthsWithMovements(),
    ])

    const months = new Map<string, PeriodKey>()
    for (const key of [...withEntries, ...withMovements]) months.set(key.toString(), key)

    const ordered = [...months.values()].sort((a, b) => b.compareTo(a))

    return Promise.all(
      ordered.map(async (key) => {
        const snapshot = await this.snapshots.of(key)
        return { snapshot, blockers: blockersFor(snapshot) }
      }),
    )
  }
}
