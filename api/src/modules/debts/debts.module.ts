import { Module } from '@nestjs/common'
import { ArchivosModule } from '../../shared/archivos/archivos.module.js'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { RastroModule } from '../auditoria/rastro.module.js'
import { BudgetModule } from '../budget/budget.module.js'
import { CreateDebtUseCase } from './application/create-debt.use-case.js'
import { DeleteDebtUseCase } from './application/delete-debt.use-case.js'
import { DocumentoDeDeudaUseCase } from './application/documento-de-deuda.use-case.js'
import { GetDebtUseCase } from './application/get-debt.use-case.js'
import { GetPayoffPlanUseCase } from './application/get-payoff-plan.use-case.js'
import { GetScheduleUseCase } from './application/get-schedule.use-case.js'
import { ListDebtsUseCase } from './application/list-debts.use-case.js'
import { PagosDeDeudaUseCase } from './application/pagos-de-deuda.use-case.js'
import { SimulateExtraPaymentUseCase } from './application/simulate-extra-payment.use-case.js'
import { UpdateDebtUseCase } from './application/update-debt.use-case.js'
import { DEBT_REPOSITORY } from './domain/debt-repository.port.js'
import { DebtsController } from './infrastructure/debts.controller.js'
import { PrismaDebtRepository } from './infrastructure/prisma-debt.repository.js'

@Module({
  // Una deuda declara a qué cubeta del presupuesto pertenece: depende del guardián que
  // sabe cuáles existen, no de las tablas del presupuesto. Y pagar una cuota escribe su gasto
  // en la contabilidad, con el mismo caso de uso que cualquier otro movimiento.
  imports: [PrismaModule, BudgetModule, AccountingModule, RastroModule, ArchivosModule],
  controllers: [DebtsController],
  providers: [
    { provide: DEBT_REPOSITORY, useClass: PrismaDebtRepository },
    ListDebtsUseCase,
    CreateDebtUseCase,
    GetDebtUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
    GetScheduleUseCase,
    SimulateExtraPaymentUseCase,
    GetPayoffPlanUseCase,
    PagosDeDeudaUseCase,
    DocumentoDeDeudaUseCase,
  ],
  exports: [DEBT_REPOSITORY],
})
export class DebtsModule {}
