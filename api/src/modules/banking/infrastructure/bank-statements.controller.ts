import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UploadedFile as UploadedFileDecorator,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  paginated,
  paginationQuerySchema,
  type Paginated,
  type PaginationQuery,
} from '../../../shared/http/pagination.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ImportStatementUseCase } from '../application/import-statement.use-case.js'
import { toParsedLineResponse } from './banking.presenters.js'
import { importStatementSchema, type ImportStatementInput } from './banking.schemas.js'
import type { UploadedFile } from './uploaded-file.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

// Sin límite, multer acepta el archivo entero en memoria: un CSV de un giga tumba el
// proceso antes de que ninguna validación llegue a mirarlo. Diez megas son ~150.000 líneas.
const CSV_UPLOAD = { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }

type ParsedLineResponse = ReturnType<typeof toParsedLineResponse>

interface StatementResponse {
  id: string
  bankAccountId: string
  fileName: string
  importedAt: string
  lineCount: number
  duplicateCount: number
}

// El único endpoint del sistema que no recibe JSON: un CSV en base64 dentro de un JSON solo
// agrega una codificación que después hay que deshacer.
@Controller('bank-statements')
export class BankStatementsController {
  constructor(private readonly statements: ImportStatementUseCase) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ): Promise<Paginated<StatementResponse>> {
    const { items, totalItems } = await this.statements.list(query.page, query.pageSize)
    return paginated(
      items.map((statement) => ({
        id: statement.id,
        bankAccountId: statement.bankAccountId,
        fileName: statement.fileName,
        importedAt: statement.importedAt.toISOString(),
        lineCount: statement.lineCount,
        duplicateCount: statement.duplicateCount,
      })),
      query.page,
      query.pageSize,
      totalItems,
    )
  }

  @Permiso('banco', 'write')
  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', CSV_UPLOAD))
  async preview(
    @UploadedFileDecorator() file: UploadedFile,
    @Body(new ZodValidationPipe(importStatementSchema)) input: ImportStatementInput,
  ): Promise<{ lines: ParsedLineResponse[] }> {
    const lines = await this.statements.preview(file, input.bankAccountId, input.profileId)
    return { lines: lines.map(toParsedLineResponse) }
  }

  @Permiso('banco', 'write')
  @Post()
  @UseInterceptors(FileInterceptor('file', CSV_UPLOAD))
  async import(
    @UploadedFileDecorator() file: UploadedFile,
    @Body(new ZodValidationPipe(importStatementSchema)) input: ImportStatementInput,
  ): Promise<{ statementId: string; fileName: string; imported: number; duplicated: number }> {
    return this.statements.execute(file, input.bankAccountId, input.profileId)
  }
}
