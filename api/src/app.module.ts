import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { AccountingModule } from './modules/accounting/accounting.module.js'
import { BudgetModule } from './modules/budget/budget.module.js'
import { GoalsModule } from './modules/goals/goals.module.js'
import { InvestmentsModule } from './modules/investments/investments.module.js'
import { DebtsModule } from './modules/debts/debts.module.js'
import { MoneyModule } from './modules/money/money.module.js'
import { PrismaModule } from './shared/prisma/prisma.module.js'

// ScheduleModule.forRoot() va una sola vez: declararlo en más de un módulo duplica
// los manejadores y el job correría dos veces.
@Module({ imports: [ScheduleModule.forRoot(), EventEmitterModule.forRoot(), PrismaModule, DebtsModule, MoneyModule, AccountingModule, BudgetModule, GoalsModule, InvestmentsModule] })
export class AppModule {}
