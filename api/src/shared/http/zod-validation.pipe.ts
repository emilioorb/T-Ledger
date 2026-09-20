import { BadRequestException, type PipeTransform } from '@nestjs/common'
import { z, type ZodType } from 'zod'

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La solicitud tiene campos inválidos',
          details: z.treeifyError(result.error),
        },
      })
    }
    return result.data
  }
}
