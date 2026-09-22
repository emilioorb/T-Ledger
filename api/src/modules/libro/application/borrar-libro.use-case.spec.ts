import { ConflictException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { conLibro } from '../../../shared/libro/libro-context.js'
import type { LibroPropio, LibroRepository } from '../domain/libro-repository.port.js'
import { BorrarLibroUseCase } from './borrar-libro.use-case.js'

const DUENNA = { bookId: 'lib_casa', userId: 'usr_duenna', rol: 'owner' } as const

const libro = (id: string): LibroPropio => ({
  id,
  name: id,
  role: 'owner',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
})

const repositorioCon = (libros: LibroPropio[]) => {
  const borrados: string[] = []
  const repositorio: LibroRepository = {
    deLaPersona: async () => libros,
    vaciar: async () => ({}),
    borrar: async (bookId) => {
      borrados.push(bookId)
    },
  }
  return { repositorio, borrados }
}

describe('BorrarLibroUseCase', () => {
  it('borra el libro en el que está parada la persona', async () => {
    const { repositorio, borrados } = repositorioCon([libro('lib_personal'), libro('lib_casa')])

    await conLibro(DUENNA, () => new BorrarLibroUseCase(repositorio).execute())

    expect(borrados).toEqual(['lib_casa'])
  })

  it('no borra el único libro de la persona', async () => {
    const { repositorio, borrados } = repositorioCon([libro('lib_casa')])

    await expect(
      conLibro(DUENNA, () => new BorrarLibroUseCase(repositorio).execute()),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(borrados).toEqual([])
  })
})
