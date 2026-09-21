import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { ClosePeriodUseCase } from './application/close-period.use-case.js'
import { CreateJournalEntryUseCase } from './application/create-journal-entry.use-case.js'
import { CreateMovementUseCase } from './application/create-movement.use-case.js'
import { GetAccountUseCase } from './application/get-account.use-case.js'
import { GetAccountsTreeUseCase } from './application/get-accounts-tree.use-case.js'
import { GetFinancialPositionUseCase } from './application/get-financial-position.use-case.js'
import { GetIncomeStatementUseCase } from './application/get-income-statement.use-case.js'
import { GetLedgerUseCase } from './application/get-ledger.use-case.js'
import { GetTrialBalanceUseCase } from './application/get-trial-balance.use-case.js'
import { ListAccountsUseCase } from './application/list-accounts.use-case.js'
import { ListJournalEntriesUseCase } from './application/list-journal-entries.use-case.js'
import { ListMovementsUseCase } from './application/list-movements.use-case.js'
import { ListPeriodsUseCase } from './application/list-periods.use-case.js'
import { ManageCategoriesUseCase } from './application/manage-categories.use-case.js'
import { MovementPoster } from './application/movement-poster.js'
import { PeriodGuard } from './application/period-guard.js'
import { PeriodSnapshots } from './application/period-snapshots.js'
import { ReopenPeriodUseCase } from './application/reopen-period.use-case.js'
import { SaveAccountUseCase } from './application/save-account.use-case.js'
import { SeedChartUseCase } from './application/seed-chart.use-case.js'
import { UpdateMovementUseCase } from './application/update-movement.use-case.js'
import { VoidMovementUseCase } from './application/void-movement.use-case.js'
import { ACCOUNT_REPOSITORY } from './domain/account-repository.port.js'
import { CATEGORY_REPOSITORY } from './domain/category-repository.port.js'
import { JOURNAL_REPOSITORY } from './domain/journal-repository.port.js'
import { MOVEMENT_REPOSITORY } from './domain/movement-repository.port.js'
import { PERIOD_REPOSITORY } from './domain/period-repository.port.js'
import { AccountsController } from './infrastructure/accounts.controller.js'
import { CategoriesController } from './infrastructure/categories.controller.js'
import { JournalEntriesController } from './infrastructure/journal-entries.controller.js'
import { MovementsController } from './infrastructure/movements.controller.js'
import { PeriodsController } from './infrastructure/periods.controller.js'
import { PrismaAccountRepository } from './infrastructure/prisma-account.repository.js'
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository.js'
import { PrismaJournalRepository } from './infrastructure/prisma-journal.repository.js'
import { PrismaMovementRepository } from './infrastructure/prisma-movement.repository.js'
import { PrismaPeriodRepository } from './infrastructure/prisma-period.repository.js'
import { ReportsController } from './infrastructure/reports.controller.js'

@Module({
  imports: [PrismaModule],
  controllers: [
    AccountsController,
    CategoriesController,
    MovementsController,
    JournalEntriesController,
    ReportsController,
    PeriodsController,
  ],
  providers: [
    // El repositorio de asientos necesita el plan de cuentas para rearmar cada agregado,
    // y lo pide por clase: por eso figura también como provider propio.
    PrismaAccountRepository,
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: JOURNAL_REPOSITORY, useClass: PrismaJournalRepository },
    { provide: MOVEMENT_REPOSITORY, useClass: PrismaMovementRepository },
    { provide: PERIOD_REPOSITORY, useClass: PrismaPeriodRepository },
    PeriodGuard,
    PeriodSnapshots,
    MovementPoster,
    SeedChartUseCase,
    ListAccountsUseCase,
    GetAccountUseCase,
    SaveAccountUseCase,
    GetAccountsTreeUseCase,
    ManageCategoriesUseCase,
    ListMovementsUseCase,
    CreateMovementUseCase,
    UpdateMovementUseCase,
    VoidMovementUseCase,
    ListJournalEntriesUseCase,
    CreateJournalEntryUseCase,
    GetTrialBalanceUseCase,
    GetLedgerUseCase,
    GetFinancialPositionUseCase,
    GetIncomeStatementUseCase,
    ClosePeriodUseCase,
    ListPeriodsUseCase,
    ReopenPeriodUseCase,
  ],
})
export class AccountingModule {}
