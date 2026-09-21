import { Global, Module } from '@nestjs/common'
import { loadEnv } from '../config/env.js'
import { PrismaService } from './prisma.service.js'
import { UNIT_OF_WORK } from './unit-of-work.port.js'

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: () => new PrismaService(loadEnv(process.env).DATABASE_URL),
    },
    { provide: UNIT_OF_WORK, useExisting: PrismaService },
  ],
  exports: [PrismaService, UNIT_OF_WORK],
})
export class PrismaModule {}
