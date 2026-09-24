import type { ImportProfile } from './import-profile.js'

export interface ImportProfileRepository {
  findAll(): Promise<ImportProfile[]>
  findById(id: string): Promise<ImportProfile | null>
  add(profile: ImportProfile): Promise<void>
  // Solo si la fila sigue en la versión: si no, `EditadoPorOtroError`, o `NotFoundError` si ya no
  // existe. Devuelve lo guardado, en su versión nueva.
  update(profile: ImportProfile): Promise<ImportProfile>
}

export const IMPORT_PROFILE_REPOSITORY = Symbol('IMPORT_PROFILE_REPOSITORY')
