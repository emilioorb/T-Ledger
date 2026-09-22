import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { puedeBorrarse } from '../domain/borrado.js'
import { LIBRO_REPOSITORY, type LibroRepository } from '../domain/libro-repository.port.js'

@Injectable()
export class BorrarLibroUseCase {
  private readonly logger = new Logger(BorrarLibroUseCase.name)

  constructor(@Inject(LIBRO_REPOSITORY) private readonly libro: LibroRepository) {}

  async execute(): Promise<void> {
    const { bookId, userId } = libroActual('borrar el libro')

    const suyos = await this.libro.deLaPersona(userId)
    if (!puedeBorrarse(suyos.length)) {
      throw new ConflictException('Es tu único libro. Para empezar de cero, vacialo.')
    }

    await this.libro.borrar(bookId)

    // Al log y no al registro de auditoría: el registro vive dentro del libro y se va con él.
    // Solo ids, como pide el ADR-005: ni el nombre del libro ni nada de lo que tenía.
    this.logger.log(`El usuario ${userId} borró el libro ${bookId}`)
  }
}
