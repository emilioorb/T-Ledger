import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import { CargarSaldosUseCase, type SaldosCargados } from '../application/cargar-saldos.use-case.js'
import { CrearBancosUseCase, type BancoCreado } from '../application/crear-bancos.use-case.js'
import {
  EstadoDeBienvenidaUseCase,
  type EstadoDeBienvenida,
} from '../application/estado-de-bienvenida.use-case.js'
import { banksSchema, openingBalancesSchema, type BanksInput, type OpeningBalancesInput } from './onboarding.schemas.js'

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly estado: EstadoDeBienvenidaUseCase,
    private readonly crearBancos: CrearBancosUseCase,
    private readonly cargarSaldos: CargarSaldosUseCase,
  ) {}

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

  @Permiso('bienvenida', 'write')
  @Post('banks')
  banks(@Body(new ZodValidationPipe(banksSchema)) input: BanksInput): Promise<BancoCreado[]> {
    return this.crearBancos.execute(input)
  }

  @Permiso('bienvenida', 'write')
  @Post('opening-balances')
  openingBalances(
    @Body(new ZodValidationPipe(openingBalancesSchema)) input: OpeningBalancesInput,
  ): Promise<SaldosCargados> {
    return this.cargarSaldos.execute(input)
  }
}
