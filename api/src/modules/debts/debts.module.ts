import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { CreateDebtUseCase } from './application/create-debt.use-case.js'
import { DeleteDebtUseCase } from './application/delete-debt.use-case.js'
import { GetDebtUseCase } from './application/get-debt.use-case.js'
import { ListDebtsUseCase } from './application/list-debts.use-case.js'
import { UpdateDebtUseCase } from './application/update-debt.use-case.js'
import { DEBT_REPOSITORY } from './domain/debt-repository.port.js'
import { DebtsController } from './infrastructure/debts.controller.js'
import { PrismaDebtRepository } from './infrastructure/prisma-debt.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [DebtsController],
  providers: [
    { provide: DEBT_REPOSITORY, useClass: PrismaDebtRepository },
    ListDebtsUseCase,
    CreateDebtUseCase,
    GetDebtUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
  ],
  exports: [DEBT_REPOSITORY],
})
export class DebtsModule {}
