import type { Contribution } from './contribution.js'
import type { Goal } from './goal.js'

export interface GoalRepository {
  findAll(): Promise<Goal[]>
  findById(id: string): Promise<Goal | null>
  add(goal: Goal): Promise<void>
  // Solo si la fila sigue en la versión de la meta: si no, `EditadoPorOtroError`, o
  // `NotFoundError` si ya no existe. Devuelve la meta en su versión nueva. Los aportes no se
  // tocan: tienen su propio camino.
  update(goal: Goal): Promise<Goal>
  // Sube la versión de la meta: quien la leyó antes del aporte no guarda encima sin enterarse.
  addContribution(goalId: string, contribution: Contribution): Promise<void>
  delete(id: string): Promise<boolean>
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY')
