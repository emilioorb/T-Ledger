import { createHash } from 'node:crypto'
import type { ParsedLine } from './bank-line.js'

// La identidad de una línea es su contenido, no su posición en el archivo: el banco puede
// reordenar, renombrar el archivo o exportar un rango que se solapa con el anterior.
export const hashOfLine = (bankAccountId: string, line: ParsedLine): string =>
  createHash('sha256')
    .update(
      [
        bankAccountId,
        line.date.toISOString().slice(0, 10),
        line.amount.minorUnits.toString(),
        line.description.trim().toLowerCase(),
        line.reference?.trim().toLowerCase() ?? '',
      ].join('|'),
    )
    .digest('hex')
