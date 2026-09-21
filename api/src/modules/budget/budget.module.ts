import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { EvaluateMonthUseCase } from './application/evaluate-month.use-case.js'
import { ManageBudgetModelsUseCase } from './application/manage-budget-models.use-case.js'
import { BUDGET_INCOME_REPOSITORY } from './domain/budget-income-repository.port.js'
import { BUDGET_MODEL_REPOSITORY } from './domain/budget-model-repository.port.js'
import { AccountingSpendingProvider } from './infrastructure/accounting-spending.provider.js'
import { BudgetController } from './infrastructure/budget.controller.js'
import { BudgetModelsController } from './infrastructure/budget-models.controller.js'
import { PrismaBudgetIncomeRepository } from './infrastructure/prisma-budget-income.repository.js'
import { PrismaBudgetModelRepository } from './infrastructure/prisma-budget-model.repository.js'

@Module({
  // El presupuesto lee el gasto de la contabilidad: depende de su puerto de asientos,
  // no de sus tablas.
  imports: [PrismaModule, AccountingModule],
  controllers: [BudgetController, BudgetModelsController],
  providers: [
    { provide: BUDGET_MODEL_REPOSITORY, useClass: PrismaBudgetModelRepository },
    { provide: BUDGET_INCOME_REPOSITORY, useClass: PrismaBudgetIncomeRepository },
    AccountingSpendingProvider,
    EvaluateMonthUseCase,
    ManageBudgetModelsUseCase,
  ],
})
export class BudgetModule {}
