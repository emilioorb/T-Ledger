import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { ExchangeRateStoreModule } from '../money/exchange-rate-store.module.js'
import { AccountGuard } from './application/account-guard.js'
import { ClosePeriodUseCase } from './application/close-period.use-case.js'
import { CreateJournalEntryUseCase } from './application/create-journal-entry.use-case.js'
import { CreateMovementUseCase } from './application/create-movement.use-case.js'
import { GetAccountUseCase } from './application/get-account.use-case.js'
import { GetAccountsTreeUseCase } from './application/get-accounts-tree.use-case.js'
import { GetFinancialPositionUseCase } from './application/get-financial-position.use-case.js'
import { GetIncomeStatementUseCase } from './application/get-income-statement.use-case.js'
import { GetLedgerUseCase } from './application/get-ledger.use-case.js'
import { GetNetWorthUseCase } from './application/get-net-worth.use-case.js'
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
import { VALUATION_RATE_SOURCE } from './domain/valuation-rate.port.js'
import { AccountsController } from './infrastructure/accounts.controller.js'
import { BccrValuationRateAdapter } from './infrastructure/bccr-valuation-rate.adapter.js'
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
  // El patrimonio consolidado necesita tipos de cambio. Entra por el puerto de valuación,
  // no por el repositorio: contabilidad no sabe qué es un indicador del BCCR.
  imports: [PrismaModule, ExchangeRateStoreModule],
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
    AccountGuard,
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
    GetNetWorthUseCase,
    { provide: VALUATION_RATE_SOURCE, useClass: BccrValuationRateAdapter },
    ClosePeriodUseCase,
    ListPeriodsUseCase,
    ReopenPeriodUseCase,
  ],
  // El presupuesto lee el gasto del libro diario. Se exporta el puerto, no el repositorio:
  // quien lo consuma depende de la interfaz, no de Prisma.
  //
  // El asiento manual se exporta porque metas lo usa para registrar el traslado de un aporte:
  // así hereda la validación contra el plan y el guardián de período, en vez de escribir
  // asientos por su cuenta.
  exports: [
    JOURNAL_REPOSITORY,
    ACCOUNT_REPOSITORY,
    MOVEMENT_REPOSITORY,
    AccountGuard,
    CreateMovementUseCase,
    CreateJournalEntryUseCase,
  ],
})
export class AccountingModule {}
