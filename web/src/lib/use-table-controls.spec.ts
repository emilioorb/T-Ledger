import { describe, expect, it } from 'vitest'
import { compareValues, filterRows, sortRows } from './use-table-controls.js'

interface Row {
  name: string
  minor: string
  due: string
  n: number
}

const rows: Row[] = [
  { name: 'Tarjeta BAC', minor: '84500000', due: '2028-06-01', n: 2 },
  { name: 'CONAPE', minor: '5634929300', due: '2036-01-15', n: 1 },
  { name: 'Papás', minor: '120000000', due: '2029-03-10', n: 3 },
]

describe('compareValues', () => {
  it('ordena números sin pasar por string', () => {
    expect(compareValues(9, 10)).toBeLessThan(0)
  })

  it('ordena montos grandes como bigint, sin perder precisión', () => {
    expect(compareValues(900719925474099101n, 900719925474099100n)).toBeGreaterThan(0)
  })

  it('ordena texto con las reglas del español', () => {
    expect(compareValues('ñandú', 'zorro')).toBeLessThan(0)
    expect(compareValues('Álvaro', 'Alberto')).toBeGreaterThan(0)
  })
})

describe('sortRows', () => {
  it('ordena por un accesor, ascendente y descendente', () => {
    const porMonto = (row: Row) => BigInt(row.minor)
    expect(sortRows(rows, porMonto, 'asc').map((r) => r.name)).toEqual([
      'Tarjeta BAC',
      'Papás',
      'CONAPE',
    ])
    expect(sortRows(rows, porMonto, 'desc').map((r) => r.name)).toEqual([
      'CONAPE',
      'Papás',
      'Tarjeta BAC',
    ])
  })

  it('no muta el arreglo recibido', () => {
    const original = [...rows]
    sortRows(rows, (r) => r.n, 'desc')
    expect(rows).toEqual(original)
  })
})

describe('filterRows', () => {
  it('filtra por texto sin distinguir mayúsculas ni acentos', () => {
    expect(filterRows(rows, (r) => r.name, 'papas').map((r) => r.name)).toEqual(['Papás'])
    expect(filterRows(rows, (r) => r.name, 'CONape').map((r) => r.name)).toEqual(['CONAPE'])
  })

  it('devuelve todo cuando la consulta está vacía', () => {
    expect(filterRows(rows, (r) => r.name, '   ')).toHaveLength(3)
  })

  it('devuelve vacío cuando nada coincide', () => {
    expect(filterRows(rows, (r) => r.name, 'zzz')).toHaveLength(0)
  })
})
