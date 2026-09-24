import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ManageImportProfilesUseCase } from '../application/manage-import-profiles.use-case.js'
import { toImportProfileResponse } from './banking.presenters.js'
import { importProfileSchema, updateImportProfileSchema, type ImportProfileInput, type UpdateImportProfileInput } from './banking.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type ImportProfileResponse = ReturnType<typeof toImportProfileResponse>

@Controller('import-profiles')
export class ImportProfilesController {
  constructor(private readonly profiles: ManageImportProfilesUseCase) {}

  @Get()
  async list(): Promise<ImportProfileResponse[]> {
    return (await this.profiles.list()).map(toImportProfileResponse)
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ImportProfileResponse> {
    return toImportProfileResponse(await this.profiles.find(id))
  }

  @Permiso('banco', 'write')
  @Post()
  async create(
    @Body(new ZodValidationPipe(importProfileSchema)) input: ImportProfileInput,
  ): Promise<ImportProfileResponse> {
    return toImportProfileResponse(await this.profiles.create(input))
  }

  @Permiso('banco', 'write')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateImportProfileSchema)) input: UpdateImportProfileInput,
  ): Promise<ImportProfileResponse> {
    return toImportProfileResponse(await this.profiles.update(id, input))
  }
}
