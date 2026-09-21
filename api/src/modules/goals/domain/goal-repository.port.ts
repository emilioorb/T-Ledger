import type { Contribution } from './contribution.js'
import type { Goal } from './goal.js'

export interface GoalRepository {
  findAll(): Promise<Goal[]>
  findById(id: string): Promise<Goal | null>
  save(goal: Goal): Promise<void>
  addContribution(goalId: string, contribution: Contribution): Promise<void>
  delete(id: string): Promise<boolean>
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY')
