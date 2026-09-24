import { ConflictException } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'
import { describe, expect, it } from 'vitest'
import { LIBRO_BORRADO } from '../../identity/identity.tokens.js'
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
    borrar: async (bookId, userId, sePuede) => {
      if (!sePuede(libros.length)) return null
      borrados.push(bookId)
      return { miembros: [userId, 'usr_invitado'] }
    },
  }
  return { repositorio, borrados }
}

const eventos = () => {
  const emitidos: [string, unknown][] = []
  const emisor = { emitAsync: async (nombre: string, dato: unknown) => void emitidos.push([nombre, dato]) }
  return { emisor: emisor as unknown as EventEmitter2, emitidos }
}

describe('BorrarLibroUseCase', () => {
  // Los archivos del libro no viven en la base: se borran aparte, cuando alguien escucha esto.
  it('avisa que el libro se borró, después de borrarlo', async () => {
    const { repositorio, borrados } = repositorioCon([libro('lib_personal'), libro('lib_casa')])
    const { emisor, emitidos } = eventos()

    await conLibro(DUENNA, () => new BorrarLibroUseCase(repositorio, emisor).execute())

    expect(borrados).toEqual(['lib_casa'])
    expect(emitidos).toEqual([[LIBRO_BORRADO, { bookId: 'lib_casa', miembros: ['usr_duenna', 'usr_invitado'] }]])
  })

  it('si no se pudo borrar, no avisa', async () => {
    const { repositorio } = repositorioCon([libro('lib_casa')])
    const { emisor, emitidos } = eventos()

    await expect(conLibro(DUENNA, () => new BorrarLibroUseCase(repositorio, emisor).execute())).rejects.toThrow()
    expect(emitidos).toEqual([])
  })

  it('borra el libro en el que está parada la persona', async () => {
    const { repositorio, borrados } = repositorioCon([libro('lib_personal'), libro('lib_casa')])

    await conLibro(DUENNA, () => new BorrarLibroUseCase(repositorio, eventos().emisor).execute())

    expect(borrados).toEqual(['lib_casa'])
  })

  it('no borra el único libro de la persona', async () => {
    const { repositorio, borrados } = repositorioCon([libro('lib_casa')])

    await expect(
      conLibro(DUENNA, () => new BorrarLibroUseCase(repositorio, eventos().emisor).execute()),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(borrados).toEqual([])
  })
})
