import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { parseCsv } from './csv.js'

const parse = (text: string, delimiter: string) => unwrap(parseCsv(text, delimiter))

describe('parseCsv', () => {
  it('separa celdas por el delimitador dado', () => {
    expect(parse('a;b;c', ';')).toEqual([['a', 'b', 'c']])
    expect(parse('a,b,c', ',')).toEqual([['a', 'b', 'c']])
  })

  it('separa filas por salto de línea, con o sin retorno de carro', () => {
    expect(parse('a,b\r\nc,d\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('respeta el delimitador dentro de comillas', () => {
    expect(parse('"PAGO, COMERCIO",1000', ',')).toEqual([['PAGO, COMERCIO', '1000']])
  })

  it('respeta el salto de línea dentro de comillas', () => {
    expect(parse('"linea1\nlinea2",1000', ',')).toEqual([['linea1\nlinea2', '1000']])
  })

  it('desescapa las comillas dobles', () => {
    expect(parse('"dijo ""hola""",1000', ',')).toEqual([['dijo "hola"', '1000']])
  })

  it('conserva las celdas vacías, que en un extracto significan cero', () => {
    expect(parse('a,,c', ',')).toEqual([['a', '', 'c']])
  })

  it('descarta la última fila vacía del archivo, no las del medio', () => {
    expect(parse('a,b\n\nc,d\n', ',')).toEqual([['a', 'b'], [''], ['c', 'd']])
  })

  it('quita el BOM que Excel escribe al inicio', () => {
    expect(parse('﻿a,b', ',')).toEqual([['a', 'b']])
  })

  it('una comilla en medio de la celda son pulgadas, no una cita', () => {
    expect(parse('2026-09-01,TV 22" LED,-150000\n2026-09-02,MERCADO,-20000\n', ',')).toEqual([
      ['2026-09-01', 'TV 22" LED', '-150000'],
      ['2026-09-02', 'MERCADO', '-20000'],
    ])
  })

  it('una comilla sin cerrar es un error que nombra la fila, no un descarte silencioso', () => {
    const resultado = parseCsv('a,b\n"sin cerrar,1000\nc,d\n', ',')

    expect(resultado.ok).toBe(false)
    expect(resultado.ok === false && resultado.error.message).toContain('fila 2')
  })
})
