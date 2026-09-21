const BOM = '﻿'

// Un parser propio y no una librería: son treinta líneas, el proyecto no suma dependencias, y
// acá hace falta control exacto de la posición del error para poder decir qué fila y qué columna
// del extracto está mal.
export const parseCsv = (text: string, delimiter: string): string[][] => {
  const source = text.startsWith(BOM) ? text.slice(BOM.length) : text
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
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

  // La última fila solo cuenta si el archivo no terminaba en salto de línea.
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}
