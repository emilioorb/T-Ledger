import { versionEnTextoSchema, type VersionEnTexto } from '../../../shared/http/version.schema.js'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  revisar,
  TAMANO_MAXIMO_DOCUMENTO,
  type RechazoDeArchivo,
} from '../../../shared/archivos/archivo.js'
import { fromMoney } from '../../../shared/http/money.schema.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { CreateDebtUseCase } from '../application/create-debt.use-case.js'
import { DeleteDebtUseCase } from '../application/delete-debt.use-case.js'
import { DocumentoDeDeudaUseCase } from '../application/documento-de-deuda.use-case.js'
import { GetDebtUseCase } from '../application/get-debt.use-case.js'
import { GetPayoffPlanUseCase } from '../application/get-payoff-plan.use-case.js'
import { GetScheduleUseCase } from '../application/get-schedule.use-case.js'
import { ListDebtsUseCase } from '../application/list-debts.use-case.js'
import { PagosDeDeudaUseCase } from '../application/pagos-de-deuda.use-case.js'
import { SimulateExtraPaymentUseCase } from '../application/simulate-extra-payment.use-case.js'
import { UpdateDebtUseCase } from '../application/update-debt.use-case.js'
import { toDebtResponse } from './debt.presenter.js'
import {
  createDebtSchema,
  listDebtsQuerySchema,
  updateDebtSchema,
  type CreateDebtInput,
  type DebtResponse,
  type ListDebtsQuery,
  type UpdateDebtInput,
} from './debt.schemas.js'
import { toDebtScheduleResponse, toProjectionResponse } from './schedule.presenter.js'
import {
  marcarCuotaPagadaSchema,
  pagarCuotaSchema,
  deshacerPagoQuerySchema,
  type DeshacerPagoQuery,
  payoffPlanQuerySchema,
  simulateExtraPaymentSchema,
  type DebtScheduleResponse,
  type MarcarCuotaPagadaInput,
  type PagarCuotaInput,
  type PayoffPlanQuery,
  type PayoffPlanResponse,
  type ProjectionResponse,
  type SimulateExtraPaymentInput,
} from './schedule.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

// Lo que multer deja en la petición, con lo que de verdad se usa.
interface ArchivoSubido {
  buffer: Buffer
  mimetype: string
  size: number
}

const MOTIVOS: Record<RechazoDeArchivo, string> = {
  tipo: 'El documento tiene que ser un PDF o una foto.',
  tamano: 'El documento no puede pesar más de 20 MB.',
  vacio: 'Ese archivo está vacío.',
}

const utc = (date: string): Date => new Date(`${date}T00:00:00.000Z`)

@Controller('debts')
export class DebtsController {
  constructor(
    private readonly listDebts: ListDebtsUseCase,
    private readonly createDebt: CreateDebtUseCase,
    private readonly getDebt: GetDebtUseCase,
    private readonly updateDebt: UpdateDebtUseCase,
    private readonly deleteDebt: DeleteDebtUseCase,
    private readonly getSchedule: GetScheduleUseCase,
    private readonly simulateExtraPayment: SimulateExtraPaymentUseCase,
    private readonly getPayoffPlan: GetPayoffPlanUseCase,
    private readonly pagos: PagosDeDeudaUseCase,
    private readonly documento: DocumentoDeDeudaUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listDebtsQuerySchema)) query: ListDebtsQuery,
  ): Promise<Paginated<DebtResponse>> {
    const { items, totalItems } = await this.listDebts.execute(
      query.page,
      query.pageSize,
      query.direction,
    )
    const at = query.at ? utc(query.at) : new Date()
    return paginated(
      items.map((debt) => toDebtResponse(debt, at)),
      query.page,
      query.pageSize,
      totalItems,
    )
  }

  @Permiso('deuda', 'write')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createDebtSchema)) input: CreateDebtInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.createDebt.execute(input), new Date())
  }

  // Declarado antes de ':id': si no, Nest resolvería 'payoff-plan' como el id de una deuda.
  @Get('payoff-plan')
  async payoffPlan(
    @Query(new ZodValidationPipe(payoffPlanQuerySchema)) query: PayoffPlanQuery,
  ): Promise<PayoffPlanResponse> {
    const orderedIds = query.order ? query.order.split(',') : []
    const debts = await this.getPayoffPlan.execute(query.strategy, orderedIds)
    return {
      strategy: query.strategy,
      order: debts.map((debt) => ({
        id: debt.id,
        name: debt.name,
        balance: fromMoney(debt.balanceAt(new Date())),
        annualRate: debt.rate.annualPercentage.toString(),
        monthlyPayment: fromMoney(
          debt.schedule().installments[0]?.payment ?? debt.principal.multiply(0),
        ),
      })),
    }
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<DebtResponse> {
    return toDebtResponse(await this.getDebt.execute(id), new Date())
  }

  @Get(':id/schedule')
  async schedule(@Param('id') id: string): Promise<DebtScheduleResponse> {
    return toDebtScheduleResponse(await this.getSchedule.execute(id), new Date())
  }

  // Paga la siguiente cuota y escribe su gasto en la contabilidad.
  @Permiso('deuda', 'write')
  @Post(':id/payments')
  async pay(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pagarCuotaSchema)) input: PagarCuotaInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.pagos.pagar(id, input), new Date())
  }

  // La salda sin movimiento: para lo que se pagó antes de llevar el libro.
  @Permiso('deuda', 'write')
  @Post(':id/payments/settled')
  async settle(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marcarCuotaPagadaSchema)) input: MarcarCuotaPagadaInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.pagos.marcarPagada(id, input), new Date())
  }

  // El contrato viaja en multipart, igual que el comprobante de un movimiento.
  @Permiso('deuda', 'write')
  @Post(':id/document')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_DOCUMENTO } }))
  async subirDocumento(
    @Param('id') id: string,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Body(new ZodValidationPipe(versionEnTextoSchema)) formulario: VersionEnTexto,
  ): Promise<DebtResponse> {
    if (!archivo) throw new BadRequestException('No llegó ningún archivo.')
    const rechazo = revisar(archivo, TAMANO_MAXIMO_DOCUMENTO)
    if (rechazo) throw new BadRequestException(MOTIVOS[rechazo])

    const debt = await this.documento.guardar(id, { contenido: archivo.buffer, tipo: archivo.mimetype }, formulario.version)
    return toDebtResponse(debt, new Date())
  }

  // Redirección al enlace firmado: el navegador lo pide directo al almacenamiento.
  @Get(':id/document')
  @Redirect()
  async verDocumento(@Param('id') id: string): Promise<{ url: string }> {
    return { url: await this.documento.enlace(id) }
  }

  @Permiso('deuda', 'write')
  @Delete(':id/document')
  async quitarDocumento(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(versionEnTextoSchema)) query: VersionEnTexto,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.documento.quitar(id, query.version), new Date())
  }

  @Permiso('deuda', 'write')
  @Delete(':id/payments/last')
  async undoPayment(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(deshacerPagoQuerySchema)) query: DeshacerPagoQuery,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.pagos.deshacerUltimo(id, query), new Date())
  }

  // 200 y no 201: simular no crea nada.
  @Permiso('deuda', 'write')
  @Post(':id/simulate')
  @HttpCode(200)
  async simulate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(simulateExtraPaymentSchema)) input: SimulateExtraPaymentInput,
  ): Promise<ProjectionResponse> {
    return toProjectionResponse(await this.simulateExtraPayment.execute(id, input))
  }

  @Permiso('deuda', 'write')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDebtSchema)) input: UpdateDebtInput,
  ): Promise<DebtResponse> {
    return toDebtResponse(await this.updateDebt.execute(id, input), new Date())
  }

  @Permiso('deuda', 'write')
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(versionEnTextoSchema)) query: VersionEnTexto,
  ): Promise<void> {
    await this.deleteDebt.execute(id, query.version)
  }
}
