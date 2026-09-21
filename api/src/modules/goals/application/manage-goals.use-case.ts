import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
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
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<Goal[]> {
    return this.goals.findAll()
  }

  async find(id: string): Promise<Goal> {
    const goal = await this.goals.findById(id)
    if (!goal) throw new NotFoundError(`La meta ${id} no existe.`)
    return goal
  }

  async create(input: CreateGoalInput): Promise<Goal> {
    const goal = Goal.create({
      id: randomUUID(),
      name: input.name,
      target: toMoney(input.target),
      desiredDate: utc(input.desiredDate),
      priority: input.priority,
      accountCode: input.accountCode,
      contributions: [],
    })
    if (isErr(goal)) throw new SemanticValidationError(goal.error.message)

    await this.goals.save(goal.value)
    return goal.value
  }

  async update(id: string, input: UpdateGoalInput): Promise<Goal> {
    const props = (await this.find(id)).toProps()
    const goal = Goal.create({
      ...props,
      name: input.name ?? props.name,
      target: input.target ? toMoney(input.target) : props.target,
      desiredDate: input.desiredDate ? utc(input.desiredDate) : props.desiredDate,
      priority: input.priority ?? props.priority,
      accountCode: input.accountCode === undefined ? props.accountCode : input.accountCode,
    })
    if (isErr(goal)) throw new SemanticValidationError(goal.error.message)

    await this.goals.save(goal.value)
    return goal.value
  }

  // Alcanzar la meta emite un evento en proceso: sin bus y sin CQRS, que para un solo
  // usuario serían ceremonia sin destinatario.
  async contribute(id: string, input: CreateContributionInput): Promise<Goal> {
    const goal = await this.find(id)
    const contribution = {
      id: randomUUID(),
      date: utc(input.date),
      amount: toMoney(input.amount),
    }

    const updated = goal.addContribution(contribution)
    if (isErr(updated)) throw new SemanticValidationError(updated.error.message)

    await this.goals.addContribution(id, contribution)

    if (!goal.isReached() && updated.value.isReached()) {
      this.events.emit(GOAL_REACHED, {
        goalId: goal.id,
        name: goal.name,
        reachedAt: contribution.date,
      } satisfies GoalReached)
    }

    return updated.value
  }

  async delete(id: string): Promise<void> {
    if (!(await this.goals.delete(id))) throw new NotFoundError(`La meta ${id} no existe.`)
  }
}
