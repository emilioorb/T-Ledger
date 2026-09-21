import type { Category } from './category.js'

export interface CategoryRepository {
  findAll(): Promise<Category[]>
  findById(id: string): Promise<Category | null>
  save(category: Category): Promise<void>
  delete(id: string): Promise<boolean>
}

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY')
