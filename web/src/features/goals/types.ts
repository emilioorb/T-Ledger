import type { components } from '@/lib/api-types.gen'

export type Money = components['schemas']['Money']
export type Goal = components['schemas']['Goal']
export type GoalInput = components['schemas']['CreateGoalInput']
export type GoalPatch = components['schemas']['UpdateGoalInput']
export type ContributionInput = components['schemas']['CreateContributionInput']
export type Contribution = Goal['contributions'][number]
