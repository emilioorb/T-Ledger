import { Inject, Injectable } from '@nestjs/common'
import {
  LIBRO_REPOSITORY,
  type LibroPropio,
  type LibroRepository,
} from '../domain/libro-repository.port.js'

@Injectable()
export class MisLibrosUseCase {
  constructor(@Inject(LIBRO_REPOSITORY) private readonly libros: LibroRepository) {}

  deLaPersona(userId: string): Promise<LibroPropio[]> {
    return this.libros.deLaPersona(userId)
  }
}
