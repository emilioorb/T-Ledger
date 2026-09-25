import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { AccountingModule } from '../accounting/accounting.module.js'
import { BankingModule } from '../banking/banking.module.js'
import { BudgetModule } from '../budget/budget.module.js'
import { CargarSaldosUseCase } from './application/cargar-saldos.use-case.js'
import { CrearBancosUseCase } from './application/crear-bancos.use-case.js'
import { CrearCategoriasUseCase } from './application/crear-categorias.use-case.js'
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
    CrearBancosUseCase,
    CargarSaldosUseCase,
    CrearCategoriasUseCase,
  ],
})
export class OnboardingModule {}
