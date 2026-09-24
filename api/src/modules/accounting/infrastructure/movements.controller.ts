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
import { TAMANO_MAXIMO, revisar, type RechazoDeArchivo } from '../../../shared/archivos/archivo.js'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import {
  CreateMovementUseCase,
  type PostedMovement,
} from '../application/create-movement.use-case.js'
import { ListMovementsUseCase } from '../application/list-movements.use-case.js'
import { ManageComprobanteUseCase } from '../application/manage-comprobante.use-case.js'
import { UpdateMovementUseCase } from '../application/update-movement.use-case.js'
import { VoidMovementUseCase } from '../application/void-movement.use-case.js'
import type { MovementFilters } from '../domain/movement-repository.port.js'
import { toCategoryTotalResponse, toMovementResponse } from './accounting.presenters.js'
import {
  createMovementSchema,
  listMovementsQuerySchema,
  movementTotalsQuerySchema,
  updateMovementSchema,
  voidMovementSchema,
  type CreateMovementInput,
  type ListMovementsQuery,
  type MovementTotalsQuery,
  type UpdateMovementInput,
  type VoidMovementInput,
} from './accounting.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type MovementResponse = ReturnType<typeof toMovementResponse>

// Por qué no se aceptó el archivo, en palabras. «Bad request» a secas deja a la persona
// probando otra vez con el mismo archivo.
// Lo que multer deja en la petición, con lo que de verdad se usa. Escrito acá en vez de
// sumar `@types/multer`: son cuatro campos y así el tipo dice qué se toca del archivo.
interface ArchivoSubido {
  buffer: Buffer
  mimetype: string
  size: number
}

const MOTIVOS: Record<RechazoDeArchivo, string> = {
  tipo: 'El comprobante tiene que ser una foto o un PDF.',
  tamano: 'El comprobante no puede pesar más de 5 MB.',
  vacio: 'Ese archivo está vacío.',
}
type CategoryTotalResponse = ReturnType<typeof toCategoryTotalResponse>

const present = ({ movement, journalEntryId }: PostedMovement): MovementResponse =>
  toMovementResponse(movement, journalEntryId)

const rangeOf = (query: MovementTotalsQuery): DateRange | undefined => {
  if (!query.from || !query.to) return undefined
  const range = DateRange.create(
    new Date(`${query.from}T00:00:00.000Z`),
    new Date(`${query.to}T00:00:00.000Z`),
  )
  if (isErr(range)) throw new SemanticValidationError(range.error.message)
  return range.value
}

// Los mismos filtros para la lista y para el resumen: si se arman en dos lugares, el día que
// alguien agregue uno la barra deja de hablar de la tabla que tiene debajo.
const filtersOf = (query: MovementTotalsQuery): MovementFilters => {
  const range = rangeOf(query)
  return {
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(range ? { range } : {}),
    ...(query.search ? { search: query.search } : {}),
  }
}

@Controller('movements')
export class MovementsController {
  constructor(
    private readonly listMovements: ListMovementsUseCase,
    private readonly createMovement: CreateMovementUseCase,
    private readonly updateMovement: UpdateMovementUseCase,
    private readonly voidMovement: VoidMovementUseCase,
    private readonly comprobante: ManageComprobanteUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listMovementsQuerySchema)) query: ListMovementsQuery,
  ): Promise<Paginated<MovementResponse>> {
    const filters = filtersOf(query)

    const { items, totalItems } = await this.listMovements.execute(
      filters,
      query.page,
      query.pageSize,
    )
    return paginated(items.map(present), query.page, query.pageSize, totalItems)
  }

  // Antes de `:id` a propósito: Nest resuelve por orden de declaración, y abajo `summary`
  // entraría como el identificador de un movimiento que no existe.
  @Get('summary')
  async totals(
    @Query(new ZodValidationPipe(movementTotalsQuerySchema)) query: MovementTotalsQuery,
  ): Promise<CategoryTotalResponse[]> {
    const totals = await this.listMovements.totalsByCategory(filtersOf(query))
    return totals.map(toCategoryTotalResponse)
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<MovementResponse> {
    return present(await this.listMovements.byId(id))
  }

  @Permiso('movimiento', 'create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createMovementSchema)) input: CreateMovementInput,
  ): Promise<MovementResponse> {
    return present(await this.createMovement.execute(input))
  }

  @Permiso('movimiento', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMovementSchema)) input: UpdateMovementInput,
  ): Promise<MovementResponse> {
    return present(await this.updateMovement.execute(id, input))
  }

  // El archivo viaja en `multipart/form-data` y no en base64 dentro de un JSON: base64 infla
  // un tercio y obliga a cargar el archivo entero en memoria dos veces. `memoryStorage` está
  // bien para cinco megas, que es el tope.
  @Permiso('movimiento', 'update')
  @Post(':id/receipt')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO } }))
  async subirComprobante(
    @Param('id') id: string,
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ): Promise<MovementResponse> {
    if (!archivo) throw new BadRequestException('No llegó ningún archivo.')

    const rechazo = revisar(archivo)
    if (rechazo) throw new BadRequestException(MOTIVOS[rechazo])

    await this.comprobante.guardar(id, { contenido: archivo.buffer, tipo: archivo.mimetype })

    // Se relee en vez de armar la respuesta a mano: el movimiento sigue teniendo su asiento,
    // y devolver `journalEntryId: null` lo habría mostrado como «sin contabilizar» en la
    // tabla por el solo hecho de haberle adjuntado una foto.
    return present(await this.listMovements.byId(id))
  }

  // Redirección y no el archivo: con R2 el enlace va firmado y vence en minutos, así que el
  // navegador lo pide directo al bucket y la API no se convierte en un proxy de archivos.
  @Get(':id/receipt')
  @Redirect()
  async verComprobante(@Param('id') id: string): Promise<{ url: string }> {
    return { url: await this.comprobante.enlace(id) }
  }

  @Permiso('movimiento', 'update')
  @Delete(':id/receipt')
  async quitarComprobante(@Param('id') id: string): Promise<MovementResponse> {
    await this.comprobante.quitar(id)
    return present(await this.listMovements.byId(id))
  }

  // 200 y no 201: anular no crea un movimiento, marca el que ya existía.
  @Permiso('movimiento', 'create')
  @Post(':id/void')
  @HttpCode(200)
  async void(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(voidMovementSchema)) input: VoidMovementInput,
  ): Promise<MovementResponse> {
    return present(await this.voidMovement.execute(id, input.version))
  }
}
