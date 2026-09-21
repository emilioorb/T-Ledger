import { err, ok, type Result } from '../../../shared/kernel/result.js'

const BOM = '﻿'

// Un parser propio y no una librería: son treinta líneas, el proyecto no suma dependencias, y
// acá hace falta control exacto de la posición del error para poder decir qué fila y qué columna
// del extracto está mal.
//
// La comilla solo abre modo citado como primer carácter de una celda vacía. Si abriera en
// cualquier posición, una descripción con pulgadas —`TV 22" LED`— se tragaría todo hasta la
// siguiente comilla del archivo: las filas del medio desaparecen y la resultante tiene el número
// de columnas correcto, así que pasa todas las validaciones. Por lo mismo, una comilla sin cerrar
// al final del archivo es un error y no un descarte en silencio.
export const parseCsv = (text: string, delimiter: string): Result<string[][], RangeError> => {
  const source = text.startsWith(BOM) ? text.slice(BOM.length) : text
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let quoteOpenedAtRow = 0

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (quoted) {
      if (char !== '"') {
        cell += char
      } else if (source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = false
      }
      continue
    }

    if (char === '"' && cell === '') {
      quoted = true
      quoteOpenedAtRow = rows.length + 1
    } else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }

  if (quoted) {
    return err(new RangeError(`La fila ${quoteOpenedAtRow} abre comillas que nunca se cierran`))
  }

  // La última fila solo cuenta si el archivo no terminaba en salto de línea.
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return ok(rows)
}
