import { describe, expect, it, vi } from 'vitest'
import type { Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { BorrarArchivosDelLibro } from './borrar-archivos-del-libro.listener.js'

const almacenamiento = (borrarTodoBajo: Almacenamiento['borrarTodoBajo']): Almacenamiento => ({
  guardar: vi.fn(),
  enlaceDeLectura: vi.fn(),
  borrar: vi.fn(),
  borrarTodoBajo,
})

describe('BorrarArchivosDelLibro', () => {
  it('se lleva todo lo que cuelga de la carpeta del libro', async () => {
    const borrar = vi.fn(async () => {})

    await new BorrarArchivosDelLibro(almacenamiento(borrar)).manejar({ bookId: 'lib_casa', miembros: [] })

    expect(borrar).toHaveBeenCalledWith('libros/lib_casa/')
  })

  // El libro ya se borró: un archivo que no se pudo borrar ocupa unos bytes, y hacer fallar la
  // operación por eso le diría a la persona que su libro sigue ahí cuando no es así.
  it('si el almacenamiento falla, no tira: el libro ya no existe', async () => {
    const borrar = vi.fn(async () => {
      throw new Error('R2 caído')
    })

    await expect(new BorrarArchivosDelLibro(almacenamiento(borrar)).manejar({ bookId: 'lib_casa', miembros: [] })).resolves.toBeUndefined()
  })
})
