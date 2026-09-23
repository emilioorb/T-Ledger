import { describe, expect, it, vi } from 'vitest'
import type { Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { conLibro } from '../../../shared/libro/libro-context.js'
import type { UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import type { Rastro } from '../../auditoria/domain/rastro.port.js'
import type { LibroRepository } from '../domain/libro-repository.port.js'
import { VaciarLibroUseCase } from './vaciar-libro.use-case.js'

const DUENNA = { bookId: 'lib_casa', userId: 'usr_duenna', rol: 'owner' } as const

const armar = (borrarTodoBajo: Almacenamiento['borrarTodoBajo']) => {
  const libro: LibroRepository = {
    deLaPersona: vi.fn(),
    vaciar: vi.fn(async () => ({ movement: 3, debt: 1 })),
    borrar: vi.fn(),
  }
  const transaction: UnitOfWork = { withTransaction: (run) => run() }
  const rastro: Rastro = { registrar: vi.fn(async () => {}) }
  const archivos: Almacenamiento = { guardar: vi.fn(), enlaceDeLectura: vi.fn(), borrar: vi.fn(), borrarTodoBajo }
  return new VaciarLibroUseCase(libro, transaction, rastro, archivos)
}

describe('vaciar un libro', () => {
  // Se van todos los movimientos y todas las deudas, así que sus carpetas enteras sobran.
  it('se lleva los comprobantes y los contratos de deudas, y nada más del libro', async () => {
    const borrar = vi.fn<Almacenamiento['borrarTodoBajo']>(async () => {})

    await conLibro(DUENNA, () => armar(borrar).execute())

    expect(borrar.mock.calls.map(([prefijo]) => prefijo).sort()).toEqual([
      'libros/lib_casa/comprobantes/',
      'libros/lib_casa/documentos/deudas/',
    ])
  })

  it('si el almacenamiento falla, el vaciado igual se completa', async () => {
    const borrar = vi.fn(async () => {
      throw new Error('R2 caído')
    })

    await expect(conLibro(DUENNA, () => armar(borrar).execute())).resolves.toEqual({ movement: 3, debt: 1 })
  })
})
