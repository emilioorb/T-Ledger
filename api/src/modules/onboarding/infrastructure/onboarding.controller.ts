import { Controller, Get, HttpCode, Post } from '@nestjs/common'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import {
  EstadoDeBienvenidaUseCase,
  type EstadoDeBienvenida,
} from '../application/estado-de-bienvenida.use-case.js'

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly estado: EstadoDeBienvenidaUseCase) {}

  @Get()
  status(): Promise<EstadoDeBienvenida> {
    return this.estado.estado()
  }

  // Se llama al abrir el modal. 204 siempre: si ya estaba vista, no hay nada que avisar.
  @Permiso('bienvenida', 'write')
  @Post('start')
  @HttpCode(204)
  start(): Promise<void> {
    return this.estado.empezar()
  }
}
