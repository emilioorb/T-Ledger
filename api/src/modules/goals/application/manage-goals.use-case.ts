import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { AccountGuard } from '../../accounting/application/account-guard.js'
import { CreateJournalEntryUseCase } from '../../accounting/application/create-journal-entry.use-case.js'
import { GOAL_REACHED, type GoalReached } from '../domain/goal-events.js'
import { Goal } from '../domain/goal.js'
import { GOAL_REPOSITORY, type GoalRepository } from '../domain/goal-repository.port.js'
import type {
  CreateContributionInput,
  CreateGoalInput,
  UpdateGoalInput,
} from '../infrastructure/goals.schemas.js'

const utc = (date: string): Date => new Date(`${date}T00:00:00.000Z`)

@Injectable()
export class ManageGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goals: GoalRepository,
    private readonly journal: CreateJournalEntryUseCase,
    private readonly accounts: AccountGuard,
    private readonly events: EventEmitter2,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async list(): Promise<Goal[]> {
    return this.goals.findAll()
  }

  async find(id: string): Promise<Goal> {
    const goal = await this.goals.findById(id)
    if (!goal) throw new NotFoundError(`La meta ${id} no existe.`)
    return goal
  }

  // Todo adentro del candado del libro: la cuenta, la meta y lo aportado se leen ahí (ADR-006).
  create(input: CreateGoalInput): Promise<Goal> {
    return this.transaction.withTransaction(async () => {
      await this.accounts.assertPostable(input.accountCode)
      const goal = Goal.create({
        id: randomUUID(),
        name: input.name,
        target: toMoney(input.target),
        desiredDate: utc(input.desiredDate),
        priority: input.priority,
        accountCode: input.accountCode,
        active: input.active,
        contributions: [],
      })
      if (isErr(goal)) throw new SemanticValidationError(goal.error.message)

      await this.goals.add(goal.value)
      await this.rastro.registrar({
        entidad: 'meta',
        entidadId: goal.value.id,
        accion: 'crear',
        despues: goal.value.toProps(),
      })
      return goal.value
    })
  }

  update(id: string, { version, ...input }: UpdateGoalInput): Promise<Goal> {
    return this.transaction.withTransaction(async () => {
      const actual = await this.find(id)
      exigirVersion(version, actual.version, 'editar una meta')
      const props = actual.toProps()
      if (input.accountCode !== undefined) await this.accounts.assertPostable(input.accountCode)
      const goal = Goal.create({
        ...props,
        name: input.name ?? props.name,
        target: input.target ? toMoney(input.target) : props.target,
        desiredDate: input.desiredDate ? utc(input.desiredDate) : props.desiredDate,
        priority: input.priority ?? props.priority,
        accountCode: input.accountCode === undefined ? props.accountCode : input.accountCode,
        active: input.active ?? props.active ?? true,
      })
      if (isErr(goal)) throw new SemanticValidationError(goal.error.message)

      const guardada = await this.goals.update(goal.value)
      await this.rastro.registrar({
        entidad: 'meta',
        entidadId: id,
        accion: 'editar',
        antes: props,
        despues: goal.value.toProps(),
      })
      return guardada
    })
  }

  // Dos aportes a la vez son dos aportes: no se pide versión. Lo que sí se decide adentro es si
  // este aporte alcanzó la meta, así de dos que la cruzan a la vez solo uno la anuncia.
  //
  // Alcanzar la meta emite un evento en proceso: sin bus y sin CQRS, que para un solo
  // usuario serían ceremonia sin destinatario.
  async contribute(id: string, input: CreateContributionInput): Promise<Goal> {
    const { goal, alcanzo, contribution } = await this.transaction.withTransaction(() => this.aportar(id, input))

    // El evento va afuera: avisar de una meta alcanzada que la transacción todavía puede
    // revertir sería anunciar algo que no pasó.
    if (alcanzo) {
      this.events.emit(GOAL_REACHED, {
        goalId: goal.id,
        name: goal.name,
        reachedAt: contribution.date,
      } satisfies GoalReached)
    }
    return goal
  }

  private async aportar(id: string, input: CreateContributionInput) {
    const goal = await this.find(id)

    // Sin cuenta de ahorro no hay dónde poner la plata, y un aporte que no se puede asentar
    // sería un número que la contabilidad no ve: la meta diría que ya ahorraste y los libros
    // que esa plata sigue en caja.
    if (goal.accountCode === null) {
      throw new SemanticValidationError(
        `La meta «${goal.name}» no tiene cuenta de ahorro. Elegí una antes de registrar aportes.`,
      )
    }

    const contribution = {
      id: randomUUID(),
      date: utc(input.date),
      amount: toMoney(input.amount),
    }

    const updated = goal.addContribution(contribution)
    if (isErr(updated)) throw new SemanticValidationError(updated.error.message)

    // El asiento primero: si el período está cerrado o las cuentas no aceptan el movimiento,
    // el aporte no se registra. Y los dos en la misma transacción, porque si la segunda
    // escritura falla queda un asiento huérfano: el libro dice que ahorraste y la meta no.
    await this.journal.execute({
      date: input.date,
      description: `Aporte a ${goal.name}`,
      reference: null,
      lines: [
        { accountCode: goal.accountCode, amount: input.amount, side: 'DEBIT' },
        { accountCode: input.fromAccountCode, amount: input.amount, side: 'CREDIT' },
      ],
    })

    await this.goals.addContribution(id, contribution)
    // Un aporte es plata que se mueve, así que deja rastro como cualquier otro movimiento.
    // El `despues` es el aporte y no la meta entera: lo que pasó fue que entró este monto,
    // no que la meta cambió de nombre.
    await this.rastro.registrar({
      entidad: 'meta',
      entidadId: id,
      accion: 'aportar',
      despues: contribution,
    })

    return {
      goal: updated.value.guardada(),
      alcanzo: !goal.isReached() && updated.value.isReached(),
      contribution,
    }
  }

  delete(id: string, version?: number): Promise<void> {
    // Se lee antes de borrar, y adentro: después ya no hay a quién preguntarle qué meta era.
    return this.transaction.withTransaction(async () => {
      const meta = await this.find(id)
      exigirVersion(version, meta.version, 'borrar una meta')
      await this.goals.delete(id)
      await this.rastro.registrar({ entidad: 'meta', entidadId: id, accion: 'eliminar', antes: meta.toProps() })
    })
  }
}
