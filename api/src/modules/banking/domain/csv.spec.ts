import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv.js'

describe('parseCsv', () => {
  it('separa celdas por el delimitador dado', () => {
    expect(parseCsv('a;b;c', ';')).toEqual([['a', 'b', 'c']])
    expect(parseCsv('a,b,c', ',')).toEqual([['a', 'b', 'c']])
  })

  it('separa filas por salto de línea, con o sin retorno de carro', () => {
    expect(parseCsv('a,b\r\nc,d\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('respeta el delimitador dentro de comillas', () => {
    expect(parseCsv('"PAGO, COMERCIO",1000', ',')).toEqual([['PAGO, COMERCIO', '1000']])
  })

  it('respeta el salto de línea dentro de comillas', () => {
    expect(parseCsv('"linea1\nlinea2",1000', ',')).toEqual([['linea1\nlinea2', '1000']])
  })

  it('desescapa las comillas dobles', () => {
    expect(parseCsv('"dijo ""hola""",1000', ',')).toEqual([['dijo "hola"', '1000']])
  })

  it('conserva las celdas vacías, que en un extracto significan cero', () => {
    expect(parseCsv('a,,c', ',')).toEqual([['a', '', 'c']])
  })

  it('descarta la última fila vacía del archivo, no las del medio', () => {
    expect(parseCsv('a,b\n\nc,d\n', ',')).toEqual([['a', 'b'], [''], ['c', 'd']])
  })

  it('quita el BOM que Excel escribe al inicio', () => {
    expect(parseCsv('﻿a,b', ',')).toEqual([['a', 'b']])
  })
})
