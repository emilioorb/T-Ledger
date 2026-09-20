import { Module } from '@nestjs/common'
import { DebtsModule } from './modules/debts/debts.module.js'
import { PrismaModule } from './shared/prisma/prisma.module.js'

@Module({ imports: [PrismaModule, DebtsModule] })
export class AppModule {}
