import { Injectable } from '@nestjs/common'
import type { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import {
  PASOS_DE_BIENVENIDA,
  type OnboardingStepRepository,
  type PasoDeBienvenida,
} from '../domain/onboarding-step-repository.port.js'

const esPaso = (valor: string): valor is PasoDeBienvenida =>
  (PASOS_DE_BIENVENIDA as readonly string[]).includes(valor)

@Injectable()
export class PrismaOnboardingStepRepository implements OnboardingStepRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(step: PasoDeBienvenida): Promise<unknown | null> {
    const fila = await this.prisma.client.onboardingStep.findUnique({
      where: { bookId_step: { bookId: this.prisma.libro, step } },
    })
    return fila?.result ?? null
  }

  async findAll(): Promise<Partial<Record<PasoDeBienvenida, unknown>>> {
    const filas = await this.prisma.client.onboardingStep.findMany({ where: { bookId: this.prisma.libro } })
    return Object.fromEntries(filas.filter((fila) => esPaso(fila.step)).map((fila) => [fila.step, fila.result]))
  }

  async save(step: PasoDeBienvenida, result: unknown): Promise<void> {
    await this.prisma.client.onboardingStep.create({
      data: { bookId: this.prisma.libro, step, result: result as Prisma.InputJsonValue },
    })
  }
}
