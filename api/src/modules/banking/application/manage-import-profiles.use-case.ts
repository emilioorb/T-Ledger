import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ImportProfile, type ImportProfileProps } from '../domain/import-profile.js'
import {
  IMPORT_PROFILE_REPOSITORY,
  type ImportProfileRepository,
} from '../domain/import-profile-repository.port.js'
import type { ImportProfileInput } from '../infrastructure/banking.schemas.js'

@Injectable()
export class ManageImportProfilesUseCase {
  constructor(
    @Inject(IMPORT_PROFILE_REPOSITORY) private readonly profiles: ImportProfileRepository,
  ) {}

  async list(): Promise<ImportProfile[]> {
    return this.profiles.findAll()
  }

  async find(id: string): Promise<ImportProfile> {
    const profile = await this.profiles.findById(id)
    if (!profile) throw new NotFoundError(`El perfil de importación ${id} no existe.`)
    return profile
  }

  async create(input: ImportProfileInput): Promise<ImportProfile> {
    return this.save({ id: randomUUID(), ...input })
  }

  async update(id: string, input: ImportProfileInput): Promise<ImportProfile> {
    await this.find(id)
    return this.save({ id, ...input })
  }

  private async save(props: ImportProfileProps): Promise<ImportProfile> {
    const profile = ImportProfile.create(props)
    if (isErr(profile)) throw new SemanticValidationError(profile.error.message)

    await this.profiles.save(profile.value)
    return profile.value
  }
}
