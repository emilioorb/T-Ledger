import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ManageCategoriesUseCase } from '../application/manage-categories.use-case.js'
import { toCategoryResponse } from './accounting.presenters.js'
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './accounting.schemas.js'

type CategoryResponse = ReturnType<typeof toCategoryResponse>

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: ManageCategoriesUseCase) {}

  // Sin paginación: las categorías son una lista corta que la interfaz necesita entera
  // para poder ofrecerlas en un selector.
  @Get()
  async list(): Promise<CategoryResponse[]> {
    return (await this.categories.list()).map(toCategoryResponse)
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<CategoryResponse> {
    return toCategoryResponse(await this.categories.find(id))
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createCategorySchema)) input: CreateCategoryInput,
  ): Promise<CategoryResponse> {
    return toCategoryResponse(await this.categories.create(input))
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) input: UpdateCategoryInput,
  ): Promise<CategoryResponse> {
    return toCategoryResponse(await this.categories.update(id, input))
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    await this.categories.delete(id)
  }
}
