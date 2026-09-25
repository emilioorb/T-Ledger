import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'
import { CargarSaldosUseCase, type SaldosCargados } from '../application/cargar-saldos.use-case.js'
import { CrearBancosUseCase, type BancoCreado } from '../application/crear-bancos.use-case.js'
import { CrearCategoriasUseCase, type CategoriaCreada } from '../application/crear-categorias.use-case.js'
import { DeclararIngresoInicialUseCase } from '../application/declarar-ingreso-inicial.use-case.js'
import {
  EstadoDeBienvenidaUseCase,
  type EstadoDeBienvenida,
} from '../application/estado-de-bienvenida.use-case.js'
import {
  banksSchema,
  categoriesSchema,
  incomeSchema,
  openingBalancesSchema,
  type BanksInput,
  type CategoriesInput,
  type IncomeInput,
  type OpeningBalancesInput,
} from './onboarding.schemas.js'

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly estado: EstadoDeBienvenidaUseCase,
    private readonly crearBancos: CrearBancosUseCase,
    private readonly cargarSaldos: CargarSaldosUseCase,
    private readonly crearCategorias: CrearCategoriasUseCase,
    private readonly declararIngreso: DeclararIngresoInicialUseCase,
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

  @Permiso('bienvenida', 'write')
  @Post('categories')
  categories(@Body(new ZodValidationPipe(categoriesSchema)) input: CategoriesInput): Promise<CategoriaCreada[]> {
    return this.crearCategorias.execute(input)
  }

  @Permiso('bienvenida', 'write')
  @Post('income')
  income(@Body(new ZodValidationPipe(incomeSchema)) input: IncomeInput): Promise<IncomeInput> {
    return this.declararIngreso.execute(input)
  }
}
