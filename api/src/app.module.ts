import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { DebtsModule } from './modules/debts/debts.module.js'
import { MoneyModule } from './modules/money/money.module.js'
import { PrismaModule } from './shared/prisma/prisma.module.js'

// ScheduleModule.forRoot() va una sola vez: declararlo en más de un módulo duplica
// los manejadores y el job correría dos veces.
@Module({ imports: [ScheduleModule.forRoot(), PrismaModule, DebtsModule, MoneyModule] })
export class AppModule {}
