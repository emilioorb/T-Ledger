import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { BankingModule } from '../banking/banking.module.js'
import { BudgetModule } from '../budget/budget.module.js'
import { EstadoDeBienvenidaUseCase } from './application/estado-de-bienvenida.use-case.js'
import { PasoIdempotente } from './application/paso-idempotente.js'
import { ONBOARDING_STEP_REPOSITORY } from './domain/onboarding-step-repository.port.js'
import { OnboardingController } from './infrastructure/onboarding.controller.js'
import { PrismaOnboardingStepRepository } from './infrastructure/prisma-onboarding-step.repository.js'

// Solo coordina: cada paso llama a los casos de uso de su módulo, que conservan sus reglas.
// Nadie depende de este módulo.
@Module({
  imports: [PrismaModule, AccountingModule, BankingModule, BudgetModule],
  controllers: [OnboardingController],
  providers: [
    { provide: ONBOARDING_STEP_REPOSITORY, useClass: PrismaOnboardingStepRepository },
    PasoIdempotente,
    EstadoDeBienvenidaUseCase,
  ],
})
export class OnboardingModule {}
