export const GOAL_REACHED = 'goal.reached'

// Un evento en proceso, no un bus: lo emite el caso de uso de aporte cuando la meta
// cruza su objetivo, y lo escucha quien quiera reaccionar sin acoplarse al aporte.
export interface GoalReached {
  readonly goalId: string
  readonly name: string
  readonly reachedAt: Date
}
