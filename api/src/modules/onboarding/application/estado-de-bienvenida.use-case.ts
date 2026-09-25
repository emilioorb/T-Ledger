import { Inject, Injectable } from '@nestjs/common'
import { libroActual } from '../../../shared/libro/libro-context.js'
import {
  MARCA_DE_BIENVENIDA,
  type MarcaDeBienvenida,
} from '../../identity/domain/marca-de-bienvenida.port.js'
import {
  ONBOARDING_STEP_REPOSITORY,
  type OnboardingStepRepository,
  type PasoDeBienvenida,
} from '../domain/onboarding-step-repository.port.js'

export interface EstadoDeBienvenida {
  pending: boolean
  bookId: string
  steps: Partial<Record<PasoDeBienvenida, unknown>>
}

@Injectable()
export class EstadoDeBienvenidaUseCase {
  constructor(
    @Inject(MARCA_DE_BIENVENIDA) private readonly marca: MarcaDeBienvenida,
    @Inject(ONBOARDING_STEP_REPOSITORY) private readonly pasos: OnboardingStepRepository,
  ) {}

  // Solo el dueño la ve: los pasos crean cuentas y asientos, y un editor recibiría 403 en cada
  // uno sin poder cerrarla.
  async estado(): Promise<EstadoDeBienvenida> {
    const { bookId, userId, rol } = libroActual()
    const vista = await this.marca.vista(userId)
    return { pending: !vista && rol === 'owner', bookId, steps: await this.pasos.findAll() }
  }

  empezar(): Promise<void> {
    return this.marca.marcar(libroActual().userId)
  }
}
