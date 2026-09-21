import { Module } from '@nestjs/common'
import { BudgetModule } from '../budget/budget.module.js'
import { DebtsModule } from '../debts/debts.module.js'
import { GoalsModule } from '../goals/goals.module.js'
import { InvestmentsModule } from '../investments/investments.module.js'
import { CashFlowProjectionUseCase } from './application/cash-flow-projection.use-case.js'
import { ProjectionsController } from './infrastructure/projections.controller.js'

// Sin repositorio propio y sin tablas: solo consume los puertos de los otros módulos.
@Module({
  imports: [DebtsModule, GoalsModule, InvestmentsModule, BudgetModule],
  controllers: [ProjectionsController],
  providers: [CashFlowProjectionUseCase],
})
export class ProjectionModule {}
