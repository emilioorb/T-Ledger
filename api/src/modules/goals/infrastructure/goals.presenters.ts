import { fromMoney } from '../../../shared/http/money.schema.js'
import type { Goal } from '../domain/goal.js'

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toGoalResponse = (goal: Goal, at: Date) => {
  const projectedDate = goal.projectedDate(at)
  const pace = goal.observedMonthlyPace(at)

  return {
    id: goal.id,
    name: goal.name,
    target: fromMoney(goal.target),
    desiredDate: isoDate(goal.desiredDate),
    priority: goal.priority,
    accountCode: goal.accountCode,
    contributed: fromMoney(goal.contributed()),
    remaining: fromMoney(goal.remaining()),
    progress: goal.progress().value.toString(),
    reached: goal.isReached(),
    requiredMonthlyContribution: fromMoney(goal.requiredMonthlyContribution(at)),
    observedMonthlyPace: pace ? fromMoney(pace) : null,
    projectedDate: projectedDate ? isoDate(projectedDate) : null,
    // La pregunta que la meta existe para responder: al ritmo actual, ¿llega a la fecha?
    // Sin ritmo observado todavía no se sabe, y no saber no es ir en camino.
    onTrack: projectedDate !== null && projectedDate.getTime() <= goal.desiredDate.getTime(),
    contributions: goal.contributions.map((contribution) => ({
      id: contribution.id,
      date: isoDate(contribution.date),
      amount: fromMoney(contribution.amount),
    })),
  }
}
