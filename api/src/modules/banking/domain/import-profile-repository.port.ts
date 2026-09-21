import type { ImportProfile } from './import-profile.js'

export interface ImportProfileRepository {
  findAll(): Promise<ImportProfile[]>
  findById(id: string): Promise<ImportProfile | null>
  save(profile: ImportProfile): Promise<void>
}

export const IMPORT_PROFILE_REPOSITORY = Symbol('IMPORT_PROFILE_REPOSITORY')
