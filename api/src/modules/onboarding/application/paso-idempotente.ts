import { Inject, Injectable } from '@nestjs/common'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import {
  ONBOARDING_STEP_REPOSITORY,
  type OnboardingStepRepository,
  type PasoDeBienvenida,
} from '../domain/onboarding-step-repository.port.js'

// Lee, hace y anota en una sola transacción, con el candado del libro tomado (ADR-006). Si el
// paso ya estaba, devuelve lo que devolvió entonces: es la respuesta a un reintento cuya
// respuesta se perdió. Si falla a mitad, no queda ni lo hecho ni la anotación.
@Injectable()
export class PasoIdempotente {
  constructor(
    @Inject(ONBOARDING_STEP_REPOSITORY) private readonly pasos: OnboardingStepRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  correr<T>(paso: PasoDeBienvenida, hacer: () => Promise<T>): Promise<T> {
    return this.transaction.withTransaction(async () => {
      const hecho = await this.pasos.find(paso)
      if (hecho !== null) return hecho as T
      const resultado = await hacer()
      await this.pasos.save(paso, resultado)
      return resultado
    })
  }
}
