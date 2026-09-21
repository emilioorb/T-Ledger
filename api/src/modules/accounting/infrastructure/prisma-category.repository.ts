import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { CategoryRepository } from '../domain/category-repository.port.js'
import type { Category } from '../domain/category.js'
import { categoryToDomain, type CategoryRow } from './accounting.mappers.js'

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
    return rows.map((row) => categoryToDomain(row as CategoryRow))
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { id } })
    return row ? categoryToDomain(row as CategoryRow) : null
  }

  async save(category: Category): Promise<void> {
    const data = {
      name: category.name,
      kind: category.kind,
      accountCode: category.accountCode,
      sortOrder: category.sortOrder,
      active: category.active,
    }
    await this.prisma.category.upsert({
      where: { id: category.id },
      create: { id: category.id, ...data },
      update: data,
    })
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.category.deleteMany({ where: { id } })
    return count > 0
  }
}
