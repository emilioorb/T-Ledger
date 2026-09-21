import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { ImportProfile, type ImportProfileProps } from './import-profile.js'
import { parseStatement } from './statement-parsing.js'

const base: ImportProfileProps = {
  id: 'bac',
  name: 'BAC CSV',
  delimiter: ',',
  encoding: 'utf-8',
  headerRows: 1,
  dateColumn: 0,
  dateFormat: 'DD/MM/YYYY',
  descriptionColumn: 1,
  referenceColumn: 2,
  amountColumn: 3,
  debitColumn: null,
  creditColumn: null,
  decimalSeparator: '.',
  thousandsSeparator: ',',
}

const perfil = (overrides: Partial<ImportProfileProps> = {}) =>
  unwrap(ImportProfile.create({ ...base, ...overrides }))

describe('parseStatement', () => {
  it('lee fecha, descripción, referencia y monto con signo', () => {
    const csv = 'Fecha,Descripcion,Referencia,Monto\n15/09/2026,SUPERMERCADO,REF123,-45000.50\n'

    const lines = unwrap(parseStatement(csv, perfil(), 'CRC'))

    expect(lines).toHaveLength(1)
    expect(lines[0]?.date.toISOString().slice(0, 10)).toBe('2026-09-15')
    expect(lines[0]?.description).toBe('SUPERMERCADO')
    expect(lines[0]?.reference).toBe('REF123')
    expect(lines[0]?.amount.minorUnits).toBe(-45_000_50n)
  })

  it('descarta las filas de encabezado que diga el perfil', () => {
    const csv = 'basura\nFecha,Desc,Ref,Monto\n15/09/2026,X,,100\n'

    expect(unwrap(parseStatement(csv, perfil({ headerRows: 2 }), 'CRC'))).toHaveLength(1)
  })

  it('suma débito y crédito cuando vienen en dos columnas', () => {
    const csv = 'Fecha,Desc,Debito,Credito\n15/09/2026,PAGO,50000,\n16/09/2026,DEPOSITO,,80000\n'
    const dosColumnas = perfil({
      amountColumn: null,
      debitColumn: 2,
      creditColumn: 3,
      referenceColumn: null,
    })

    const lines = unwrap(parseStatement(csv, dosColumnas, 'CRC'))

    // El débito del banco es plata que sale: entra negativa al extracto.
    expect(lines[0]?.amount.minorUnits).toBe(-50_000_00n)
    expect(lines[1]?.amount.minorUnits).toBe(80_000_00n)
  })

  it('lee montos con separador de miles y coma decimal', () => {
    const csv = 'Fecha,Desc,Ref,Monto\n15/09/2026,X,,"1.234.567,89"\n'
    const europeo = perfil({ decimalSeparator: ',', thousandsSeparator: '.' })

    expect(unwrap(parseStatement(csv, europeo, 'CRC'))[0]?.amount.minorUnits).toBe(1_234_567_89n)
  })

  it('lee el formato de fecha AAAA-MM-DD cuando el perfil lo dice', () => {
    const csv = 'Fecha,Desc,Ref,Monto\n2026-09-15,X,,100\n'

    const lines = unwrap(parseStatement(csv, perfil({ dateFormat: 'YYYY-MM-DD' }), 'CRC'))

    expect(lines[0]?.date.toISOString().slice(0, 10)).toBe('2026-09-15')
  })

  it('el error dice qué fila y qué columna, no solo que el archivo está mal', () => {
    const csv = 'Fecha,Desc,Ref,Monto\n15/09/2026,X,,no-es-un-monto\n'

    const result = parseStatement(csv, perfil(), 'CRC')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('fila 2')
      expect(result.error.message).toContain('Monto')
    }
  })

  it('una fila con menos columnas de las que el perfil espera es un error con su número', () => {
    const csv = 'Fecha,Desc,Ref,Monto\n15/09/2026,X\n'

    const result = parseStatement(csv, perfil(), 'CRC')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.message).toContain('fila 2')
  })

  it('descarta las filas totalmente vacías del final sin quejarse', () => {
    const csv = 'Fecha,Desc,Ref,Monto\n15/09/2026,X,,100\n\n'

    expect(unwrap(parseStatement(csv, perfil(), 'CRC'))).toHaveLength(1)
  })
})

describe('ImportProfile', () => {
  it('rechaza un perfil sin columna de monto y sin el par débito/crédito', () => {
    expect(
      isErr(
        ImportProfile.create({ ...base, amountColumn: null, debitColumn: null, creditColumn: null }),
      ),
    ).toBe(true)
  })

  it('rechaza un perfil con columna de monto y además débito y crédito', () => {
    expect(
      isErr(ImportProfile.create({ ...base, amountColumn: 3, debitColumn: 4, creditColumn: 5 })),
    ).toBe(true)
  })

  it('rechaza un perfil con débito pero sin crédito', () => {
    expect(
      isErr(
        ImportProfile.create({ ...base, amountColumn: null, debitColumn: 2, creditColumn: null }),
      ),
    ).toBe(true)
  })

  it('acepta el par débito y crédito sin columna de monto', () => {
    expect(
      isErr(ImportProfile.create({ ...base, amountColumn: null, debitColumn: 2, creditColumn: 3 })),
    ).toBe(false)
  })

  it('rechaza un delimitador que no sea un solo carácter', () => {
    expect(isErr(ImportProfile.create({ ...base, delimiter: ';;' }))).toBe(true)
  })
})
