import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { ManageInvestmentsUseCase } from './application/manage-investments.use-case.js'
import { INVESTMENT_REPOSITORY } from './domain/investment-repository.port.js'
import { InvestmentsController } from './infrastructure/investments.controller.js'
import { PrismaInvestmentRepository } from './infrastructure/prisma-investment.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [InvestmentsController],
  providers: [
    { provide: INVESTMENT_REPOSITORY, useClass: PrismaInvestmentRepository },
    ManageInvestmentsUseCase,
  ],
  exports: [INVESTMENT_REPOSITORY],
})
export class InvestmentsModule {}
