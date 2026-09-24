import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { RastroModule } from '../auditoria/rastro.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { BucketGuard } from './application/bucket-guard.js'
import { EvaluateMonthUseCase } from './application/evaluate-month.use-case.js'
import { DeclararIngresoUseCase } from './application/declarar-ingreso.use-case.js'
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
  imports: [PrismaModule, AccountingModule, RastroModule],
  controllers: [BudgetController, BudgetModelsController],
  providers: [
    { provide: BUDGET_MODEL_REPOSITORY, useClass: PrismaBudgetModelRepository },
    { provide: BUDGET_INCOME_REPOSITORY, useClass: PrismaBudgetIncomeRepository },
    AccountingSpendingProvider,
    BucketGuard,
    EvaluateMonthUseCase,
    ManageBudgetModelsUseCase,
    DeclararIngresoUseCase,
  ],
  // La proyección necesita el ingreso declarado del mes, no las tablas del presupuesto.
  exports: [BUDGET_INCOME_REPOSITORY, BucketGuard],
})
export class BudgetModule {}
