import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { ImportStatementUseCase } from './application/import-statement.use-case.js'
import { LineToMovementUseCase } from './application/line-to-movement.use-case.js'
import { MatchLineUseCase } from './application/match-line.use-case.js'
import { ReconcileUseCase } from './application/reconcile.use-case.js'
import { ManageBankAccountsUseCase } from './application/manage-bank-accounts.use-case.js'
import { ManageImportProfilesUseCase } from './application/manage-import-profiles.use-case.js'
import { BANK_ACCOUNT_REPOSITORY } from './domain/bank-account-repository.port.js'
import { BANK_STATEMENT_REPOSITORY } from './domain/bank-statement-repository.port.js'
import { IMPORT_PROFILE_REPOSITORY } from './domain/import-profile-repository.port.js'
import { BankAccountsController } from './infrastructure/bank-accounts.controller.js'
import { BankStatementsController } from './infrastructure/bank-statements.controller.js'
import { ImportProfilesController } from './infrastructure/import-profiles.controller.js'
import { PrismaBankAccountRepository } from './infrastructure/prisma-bank-account.repository.js'
import { PrismaBankStatementRepository } from './infrastructure/prisma-bank-statement.repository.js'
import { PrismaImportProfileRepository } from './infrastructure/prisma-import-profile.repository.js'
import { ReconciliationController } from './infrastructure/reconciliation.controller.js'

// El módulo lee el plan de cuentas y, más adelante, crea movimientos: depende de los puertos
// de contabilidad, nunca de sus tablas.
@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [
    BankAccountsController,
    ImportProfilesController,
    BankStatementsController,
    ReconciliationController,
  ],
  providers: [
    { provide: BANK_ACCOUNT_REPOSITORY, useClass: PrismaBankAccountRepository },
    { provide: IMPORT_PROFILE_REPOSITORY, useClass: PrismaImportProfileRepository },
    { provide: BANK_STATEMENT_REPOSITORY, useClass: PrismaBankStatementRepository },
    ManageBankAccountsUseCase,
    ManageImportProfilesUseCase,
    ImportStatementUseCase,
    ReconcileUseCase,
    MatchLineUseCase,
    LineToMovementUseCase,
  ],
  exports: [ManageBankAccountsUseCase],
})
export class BankingModule {}
