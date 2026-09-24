import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { ImportProfile, type ImportProfileProps } from '../domain/import-profile.js'
import {
  IMPORT_PROFILE_REPOSITORY,
  type ImportProfileRepository,
} from '../domain/import-profile-repository.port.js'
import type { ImportProfileInput, UpdateImportProfileInput } from '../infrastructure/banking.schemas.js'

const validar = (props: ImportProfileProps): ImportProfile => {
  const profile = ImportProfile.create(props)
  if (isErr(profile)) throw new SemanticValidationError(profile.error.message)
  return profile.value
}

@Injectable()
export class ManageImportProfilesUseCase {
  constructor(
    @Inject(IMPORT_PROFILE_REPOSITORY) private readonly profiles: ImportProfileRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  async list(): Promise<ImportProfile[]> {
    return this.profiles.findAll()
  }

  async find(id: string): Promise<ImportProfile> {
    const profile = await this.profiles.findById(id)
    if (!profile) throw new NotFoundError(`El perfil de importación ${id} no existe.`)
    return profile
  }

  // En transacción, con el candado del libro (ADR-006).
  async create(input: ImportProfileInput): Promise<ImportProfile> {
    return this.transaction.withTransaction(async () => {
      const profile = validar({ id: randomUUID(), ...input })
      await this.profiles.add(profile)
      return profile
    })
  }

  async update(id: string, { version, ...input }: UpdateImportProfileInput): Promise<ImportProfile> {
    return this.transaction.withTransaction(async () => {
      const actual = await this.find(id)
      exigirVersion(version, actual.version, 'editar un perfil de importación')
      return this.profiles.update(validar({ id, ...input, version: actual.version }))
    })
  }
}
