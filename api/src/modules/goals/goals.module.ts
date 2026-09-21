import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { ManageGoalsUseCase } from './application/manage-goals.use-case.js'
import { GOAL_REPOSITORY } from './domain/goal-repository.port.js'
import { GoalsController } from './infrastructure/goals.controller.js'
import { PrismaGoalRepository } from './infrastructure/prisma-goal.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [GoalsController],
  providers: [
    { provide: GOAL_REPOSITORY, useClass: PrismaGoalRepository },
    ManageGoalsUseCase,
  ],
  exports: [GOAL_REPOSITORY],
})
export class GoalsModule {}
