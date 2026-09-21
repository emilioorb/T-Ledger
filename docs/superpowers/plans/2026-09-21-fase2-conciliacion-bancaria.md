# Fase 2 — Importación de extractos y conciliación bancaria · Plan de implementación

> **Para quien lo ejecute:** SUB-SKILL REQUERIDA: usar `superpowers:executing-plans` o
> `superpowers:subagent-driven-development` para implementarlo tarea por tarea. Los pasos usan
> casillas (`- [ ]`) para seguimiento.

**Goal:** Importar extractos bancarios en CSV, cruzarlos contra los movimientos ya registrados y
dejar el saldo contable de cada cuenta de banco explicado hasta el último colón.

**Architecture:** Un módulo `banking` nuevo, con el mismo reparto de capas que el resto: dominio
puro sin Nest ni Prisma, aplicación con los casos de uso, infraestructura con Prisma y los
controladores. El módulo no escribe asientos: cuando una línea del banco tiene que convertirse en
gasto, llama al caso de uso de movimientos de `accounting`, que ya sabe generar el asiento y
respetar el período cerrado.

**Tech Stack:** NestJS 12, Prisma 7, PostgreSQL 18, Zod 4, vitest, Testcontainers. Frontend Vite +
React + TanStack Router y Query, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-09-21-conciliacion-bancaria-design.md`

## Global Constraints

Valen todas las restricciones de la fase 1: versiones pineadas, reglas de backend 1–11 y reglas de
frontend F1–F12.

- **Sin paquetes nuevos.** El CSV se lee con un parser propio en el dominio y la subida usa el
  `multer` que ya trae `@nestjs/platform-express`, tipado con una interfaz mínima propia en vez de
  `@types/multer`.
- **Nunca `any`.** Tipos propios, genéricos o `unknown`.
- **Todo monto es `Money`**, en unidades mínimas y `BigInt`. Ningún monto pasa por `number`.
- **Todo el copy sale de `copywriting`** y vive en `copy.ts` por feature.
- **El dominio no importa Nest, Prisma ni HTTP.**
- Commits con gitmoji y Conventional Commits, sin `Co-Authored-By`.

### Decisiones del spec que el plan no puede renegociar

1. El importador no escribe en el libro diario: crea `Movement`, y el movimiento genera su asiento.
2. Nada se concilia solo: el sistema sugiere con puntaje y razón, Emilio confirma.
3. La identidad de una línea es su contenido: un hash de fecha, monto, descripción y referencia,
   único por cuenta bancaria.
4. El perfil de importación es dato, no código.

### Mapa de archivos

```
api/src/modules/banking/
├── domain/
│   ├── csv.ts                      parser CSV propio, RFC 4180
│   ├── import-profile.ts           perfil y su validación cruzada
│   ├── bank-line.ts                línea, estados y hash
│   ├── statement-parsing.ts        filas del CSV a líneas, con el perfil
│   ├── reconciliation.ts           sugerencias puras, con puntaje y razón
│   ├── bank-account.ts
│   └── *.port.ts                   puertos de los tres repositorios
├── application/                    casos de uso
└── infrastructure/                 Prisma, controladores, esquemas Zod
web/src/
├── routes/                         banco.cuentas, banco.importar, banco.conciliacion
└── features/banking/               hooks, componentes y copy.ts
```

---

## Tareas

### Tarea 1: Parser de CSV

**Descripción:** Un lector de CSV que respeta comillas, separadores dentro de comillas y comillas
escapadas. Es dominio puro y no sabe nada de bancos: recibe texto y devuelve filas de celdas.

**Alcance:** S · **Dependencias:** ninguna

**Files:**
- Create: `api/src/modules/banking/domain/csv.ts`
- Test: `api/src/modules/banking/domain/csv.spec.ts`

**Interfaces:**
- Produces: `parseCsv(text: string, delimiter: string): string[][]`

- [ ] **Paso 1: Escribir el test que falla**

`api/src/modules/banking/domain/csv.spec.ts`:

```ts
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
```

- [ ] **Paso 2: Correr y confirmar que falla**

```bash
cd api && npx vitest run csv.spec
```

Esperado: falla con que `./csv.js` no existe.

- [ ] **Paso 3: Implementar**

`api/src/modules/banking/domain/csv.ts`:

```ts
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
```

- [ ] **Paso 4: Correr hasta verde y commitear**

```bash
cd api && npx vitest run csv.spec && npm run typecheck && npm run lint
git add api/src/modules/banking
git commit -m "✨ feat: parser de CSV con comillas y escapes para los extractos"
```

**Acceptance criteria:**
- [ ] Un delimitador dentro de comillas no parte la celda
- [ ] Las comillas escapadas se desescapan
- [ ] El BOM de Excel no ensucia la primera celda
- [ ] Una celda vacía se conserva

---

### Tarea 2: Perfil de importación y lectura de líneas

**Descripción:** El perfil dice cómo leer el CSV de cada banco, y la lectura convierte filas en
líneas de extracto. Es donde vive la validación cruzada del perfil y el error que nombra fila y
columna.

**Alcance:** M · **Dependencias:** Tarea 1

**Files:**
- Create: `api/src/modules/banking/domain/import-profile.ts`, `bank-line.ts`,
  `statement-parsing.ts`
- Test: `api/src/modules/banking/domain/statement-parsing.spec.ts`

**Interfaces:**
- Consumes: `parseCsv`, `Money`, `Result` del kernel
- Produces:
  - `interface ImportProfileProps { id; name; delimiter; encoding: 'utf-8' | 'latin1'; headerRows: number; dateColumn: number; dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD'; descriptionColumn: number; referenceColumn: number | null; amountColumn: number | null; debitColumn: number | null; creditColumn: number | null; decimalSeparator: '.' | ','; thousandsSeparator: string | null }`
  - `class ImportProfile` con `static create(props): Result<ImportProfile, RangeError>`
  - `interface ParsedLine { date: Date; description: string; reference: string | null; amount: Money }`
  - `parseStatement(text: string, profile: ImportProfile, currency: CurrencyCode): Result<ParsedLine[], RangeError>`

- [ ] **Paso 1: Escribir el test que falla**

`api/src/modules/banking/domain/statement-parsing.spec.ts`:

```ts
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
```

Y en el mismo archivo, la validación cruzada del perfil:

```ts
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
      isErr(ImportProfile.create({ ...base, amountColumn: null, debitColumn: 2, creditColumn: null })),
    ).toBe(true)
  })

  it('acepta el par débito y crédito sin columna de monto', () => {
    expect(
      isErr(ImportProfile.create({ ...base, amountColumn: null, debitColumn: 2, creditColumn: 3 })),
    ).toBe(false)
  })
})
```

- [ ] **Paso 2: Correr y confirmar que falla**

```bash
cd api && npx vitest run statement-parsing
```

- [ ] **Paso 3: Implementar el perfil**

`api/src/modules/banking/domain/import-profile.ts`:

```ts
import { err, ok, type Result } from '../../../shared/kernel/result.js'

export type CsvEncoding = 'utf-8' | 'latin1'
export type CsvDateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD'

export interface ImportProfileProps {
  readonly id: string
  readonly name: string
  readonly delimiter: string
  readonly encoding: CsvEncoding
  readonly headerRows: number
  readonly dateColumn: number
  readonly dateFormat: CsvDateFormat
  readonly descriptionColumn: number
  readonly referenceColumn: number | null
  readonly amountColumn: number | null
  readonly debitColumn: number | null
  readonly creditColumn: number | null
  readonly decimalSeparator: '.' | ','
  readonly thousandsSeparator: string | null
}

export class ImportProfile {
  private constructor(private readonly props: ImportProfileProps) {}

  static create(props: ImportProfileProps): Result<ImportProfile, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('El perfil necesita un nombre'))
    }
    if (props.delimiter.length !== 1) {
      return err(new RangeError('El delimitador es un solo carácter'))
    }
    if (props.headerRows < 0) {
      return err(new RangeError('Las filas de encabezado no pueden ser negativas'))
    }

    const hasAmount = props.amountColumn !== null
    const hasPair = props.debitColumn !== null && props.creditColumn !== null
    const hasHalfPair =
      (props.debitColumn === null) !== (props.creditColumn === null)

    if (hasHalfPair) {
      return err(new RangeError('Débito y crédito van juntos: o están los dos o no está ninguno'))
    }
    if (hasAmount === hasPair) {
      return err(
        new RangeError(
          'Un perfil usa una columna de monto con signo o el par débito y crédito, nunca los dos ni ninguno',
        ),
      )
    }

    return ok(new ImportProfile({ ...props, name: props.name.trim() }))
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get delimiter(): string { return this.props.delimiter }
  get encoding(): CsvEncoding { return this.props.encoding }
  get headerRows(): number { return this.props.headerRows }
  get dateColumn(): number { return this.props.dateColumn }
  get dateFormat(): CsvDateFormat { return this.props.dateFormat }
  get descriptionColumn(): number { return this.props.descriptionColumn }
  get referenceColumn(): number | null { return this.props.referenceColumn }
  get amountColumn(): number | null { return this.props.amountColumn }
  get debitColumn(): number | null { return this.props.debitColumn }
  get creditColumn(): number | null { return this.props.creditColumn }
  get decimalSeparator(): '.' | ',' { return this.props.decimalSeparator }
  get thousandsSeparator(): string | null { return this.props.thousandsSeparator }

  toProps(): ImportProfileProps {
    return { ...this.props }
  }
}
```

- [ ] **Paso 4: Implementar la lectura**

`api/src/modules/banking/domain/bank-line.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'

export type BankLineStatus = 'PENDING' | 'MATCHED' | 'IGNORED'

export interface ParsedLine {
  readonly date: Date
  readonly description: string
  readonly reference: string | null
  // Positivo entra a la cuenta, negativo sale. El signo del extracto, no el del asiento.
  readonly amount: Money
}
```

`api/src/modules/banking/domain/statement-parsing.ts`:

```ts
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { ParsedLine } from './bank-line.js'
import { parseCsv } from './csv.js'
import type { ImportProfile } from './import-profile.js'

const cellAt = (row: readonly string[], index: number): string => (row[index] ?? '').trim()

const parseDate = (value: string, format: ImportProfile['dateFormat']): Date | null => {
  const parts = format === 'DD/MM/YYYY' ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value) : null
  const iso = format === 'YYYY-MM-DD' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null

  if (parts) {
    return new Date(Date.UTC(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])))
  }
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])))
  }
  return null
}

const parseAmount = (value: string, profile: ImportProfile, currency: CurrencyCode): Money | null => {
  if (value === '') return Money.zero(currency)

  const withoutThousands = profile.thousandsSeparator
    ? value.split(profile.thousandsSeparator).join('')
    : value
  const normalized = withoutThousands.replace(profile.decimalSeparator, '.').replace(/\s/g, '')

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Money.fromDecimal(normalized, currency)
}

// El error nombra la fila y la columna: «formato inválido» obliga a abrir el CSV y adivinar.
export const parseStatement = (
  text: string,
  profile: ImportProfile,
  currency: CurrencyCode,
): Result<ParsedLine[], RangeError> => {
  const rows = parseCsv(text, profile.delimiter).slice(profile.headerRows)
  const lines: ParsedLine[] = []

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + profile.headerRows + 1
    const isEmpty = row.every((cell) => cell.trim() === '')
    if (isEmpty) continue

    const date = parseDate(cellAt(row, profile.dateColumn), profile.dateFormat)
    if (!date) {
      return err(new RangeError(`La fecha de la fila ${rowNumber} no coincide con ${profile.dateFormat}`))
    }

    const amount = amountOf(row, profile, currency)
    if (!amount) {
      return err(new RangeError(`El Monto de la fila ${rowNumber} no se pudo leer`))
    }

    lines.push({
      date,
      description: cellAt(row, profile.descriptionColumn),
      reference:
        profile.referenceColumn === null ? null : cellAt(row, profile.referenceColumn) || null,
      amount,
    })
  }

  return ok(lines)
}

// El débito del banco es plata que sale de la cuenta: entra negativa al extracto, para que el
// signo signifique lo mismo venga de una columna o de dos.
const amountOf = (
  row: readonly string[],
  profile: ImportProfile,
  currency: CurrencyCode,
): Money | null => {
  if (profile.amountColumn !== null) {
    return parseAmount(cellAt(row, profile.amountColumn), profile, currency)
  }
  if (profile.debitColumn === null || profile.creditColumn === null) return null

  const debit = parseAmount(cellAt(row, profile.debitColumn), profile, currency)
  const credit = parseAmount(cellAt(row, profile.creditColumn), profile, currency)
  if (!debit || !credit) return null

  return credit.isZero() ? debit.negate() : credit
}
```

- [ ] **Paso 5: Correr, verificar y commitear**

```bash
cd api && npx vitest run statement-parsing && npm run typecheck && npm run lint
git add api/src/modules/banking
git commit -m "✨ feat: perfil de importación y lectura de extractos CSV"
```

**Acceptance criteria:**
- [ ] Un perfil sin monto y sin el par débito/crédito es rechazado
- [ ] El débito de dos columnas entra negativo
- [ ] Un monto con miles y coma decimal se lee bien
- [ ] El error de lectura nombra la fila
- [ ] Las filas vacías del final no rompen la importación

---

### Tarea 3: Identidad de la línea, persistencia y API de cuentas y perfiles

**Descripción:** El hash que hace que reimportar no duplique, las tablas de cuentas bancarias,
perfiles, extractos y líneas, y los dos CRUD que las administran. Sin la API de perfiles, ajustar
un mapeo exigiría tocar la base a mano, que es justamente lo que la decisión 4 evita.

**Alcance:** M · **Dependencias:** Tarea 2

**Files:**
- Create: `api/src/modules/banking/domain/bank-account.ts`, `bank-line-hash.ts`,
  `bank-account-repository.port.ts`, `import-profile-repository.port.ts`,
  `bank-statement-repository.port.ts`
- Create: `api/src/modules/banking/infrastructure/prisma-*.repository.ts`, `banking.mappers.ts`
- Create: `api/src/modules/banking/infrastructure/bank-accounts.controller.ts`,
  `import-profiles.controller.ts`
- Create: `api/src/modules/banking/application/manage-bank-accounts.use-case.ts`,
  `manage-import-profiles.use-case.ts`
- Modify: `api/prisma/schema.prisma`
- Test: `api/src/modules/banking/domain/bank-line-hash.spec.ts`,
  `api/src/modules/banking/infrastructure/prisma-bank-statement.repository.spec.ts`

**Interfaces:**
- Produces:
  - `hashOfLine(bankAccountId: string, line: ParsedLine): string`
  - `interface StoredBankLine extends ParsedLine { id: string; statementId: string; hash: string; status: BankLineStatus; movementId: string | null }`
  - `BankStatementRepository.save(statement, lines): Promise<{ imported: number; duplicated: number }>`
  - `BankStatementRepository.pendingLines(bankAccountId, range, page, pageSize): Promise<{ items: StoredBankLine[]; totalItems: number }>`
  - `BankStatementRepository.findLine(id): Promise<StoredBankLine | null>`
  - `BankStatementRepository.markMatched(lineId, movementId): Promise<void>`
  - `BankStatementRepository.markPending(lineId): Promise<void>`
  - `BankStatementRepository.markIgnored(lineId): Promise<void>`

- [ ] **Paso 1: Escribir el test del hash**

```ts
import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { hashOfLine } from './bank-line-hash.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const linea = (overrides = {}) => ({
  date: utc('2026-09-15'),
  description: 'SUPERMERCADO',
  reference: 'REF1',
  amount: crc(-45_000_00n),
  ...overrides,
})

describe('hashOfLine', () => {
  it('dos líneas iguales de la misma cuenta dan el mismo hash', () => {
    expect(hashOfLine('cuenta', linea())).toBe(hashOfLine('cuenta', linea()))
  })

  it('la misma línea en otra cuenta da otro hash', () => {
    expect(hashOfLine('cuenta-a', linea())).not.toBe(hashOfLine('cuenta-b', linea()))
  })

  it('cambia con la fecha, el monto, la descripción y la referencia', () => {
    const base = hashOfLine('cuenta', linea())

    expect(hashOfLine('cuenta', linea({ date: utc('2026-09-16') }))).not.toBe(base)
    expect(hashOfLine('cuenta', linea({ amount: crc(-45_000_01n) }))).not.toBe(base)
    expect(hashOfLine('cuenta', linea({ description: 'OTRO' }))).not.toBe(base)
    expect(hashOfLine('cuenta', linea({ reference: 'REF2' }))).not.toBe(base)
  })

  it('no distingue mayúsculas ni espacios de más en la descripción', () => {
    expect(hashOfLine('cuenta', linea({ description: '  supermercado ' }))).toBe(
      hashOfLine('cuenta', linea()),
    )
  })
})
```

- [ ] **Paso 2: Implementar el hash**

```ts
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
```

- [ ] **Paso 3: Ampliar el esquema**

```prisma
enum BankLineStatus {
  PENDING
  MATCHED
  IGNORED
}

model ImportProfile {
  id                 String   @id @default(uuid(7))
  name               String
  delimiter          String   @db.Char(1)
  encoding           String
  headerRows         Int      @default(1)
  dateColumn         Int
  dateFormat         String
  descriptionColumn  Int
  referenceColumn    Int?
  amountColumn       Int?
  debitColumn        Int?
  creditColumn       Int?
  decimalSeparator   String   @db.Char(1)
  thousandsSeparator String?  @db.Char(1)
  createdAt          DateTime @default(now()) @db.Timestamptz(3)

  accounts BankAccount[]

  @@map("import_profiles")
}

model BankAccount {
  id          String   @id @default(uuid(7))
  name        String
  accountCode String
  currency    String   @db.Char(3)
  profileId   String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Timestamptz(3)

  profile    ImportProfile?  @relation(fields: [profileId], references: [id])
  statements BankStatement[]
  lines      BankLine[]

  @@map("bank_accounts")
}

model BankStatement {
  id            String   @id @default(uuid(7))
  bankAccountId String
  fileName      String
  importedAt    DateTime @default(now()) @db.Timestamptz(3)
  lineCount     Int
  duplicateCount Int     @default(0)

  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  lines       BankLine[]

  @@index([bankAccountId])
  @@map("bank_statements")
}

model BankLine {
  id            String         @id @default(uuid(7))
  statementId   String
  bankAccountId String
  date          DateTime       @db.Date
  description   String
  reference     String?
  amountMinor   BigInt
  currency      String         @db.Char(3)
  hash          String
  status        BankLineStatus @default(PENDING)
  movementId    String?

  statement   BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  bankAccount BankAccount   @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)

  @@unique([bankAccountId, hash])
  @@index([bankAccountId, status])
  @@index([date])
  @@map("bank_lines")
}
```

La unicidad de `[bankAccountId, hash]` es la que hace cumplir la decisión 3 en la base, no solo en
el código: aunque dos importaciones simultáneas pasaran el filtro, la base rechazaría la segunda.

```bash
cd api && npx prisma migrate dev --name add_banking && npx prisma generate
```

- [ ] **Paso 4: Escribir el test de integración del repositorio**

`prisma-bank-statement.repository.spec.ts`, con Testcontainers igual que los de contabilidad:

```ts
describe('PrismaBankStatementRepository', () => {
  it('guarda las líneas del extracto y devuelve cuántas entraron', async () => {
    const result = await repository.save(statement, [linea('REF1'), linea('REF2')])

    expect(result).toEqual({ imported: 2, duplicated: 0 })
    expect(await prisma.bankLine.count()).toBe(2)
  })

  it('reimportar el mismo archivo no duplica ninguna línea', async () => {
    await repository.save(statement, [linea('REF1'), linea('REF2')])
    const segunda = await repository.save(otroStatement, [linea('REF1'), linea('REF2')])

    expect(segunda).toEqual({ imported: 0, duplicated: 2 })
    expect(await prisma.bankLine.count()).toBe(2)
  })

  it('la misma línea repetida dentro del mismo archivo entra una sola vez', async () => {
    const result = await repository.save(statement, [linea('REF1'), linea('REF1')])

    expect(result).toEqual({ imported: 1, duplicated: 1 })
  })

  it('dos extractos que se solapan solo suman lo nuevo', async () => {
    await repository.save(statement, [linea('REF1')])
    const segunda = await repository.save(otroStatement, [linea('REF1'), linea('REF2')])

    expect(segunda).toEqual({ imported: 1, duplicated: 1 })
  })

  it('la misma línea en otra cuenta bancaria sí entra', async () => {
    await repository.save(statement, [linea('REF1')])
    const otra = await repository.save(statementDeOtraCuenta, [linea('REF1')])

    expect(otra.imported).toBe(1)
  })

  it('trae solo las líneas pendientes del rango', async () => {
    await repository.save(statement, [
      linea('REF1', '2026-09-05'),
      linea('REF2', '2026-10-05'),
    ])

    const pendientes = await repository.pendingLines(cuentaId, septiembre, 1, 20)

    expect(pendientes.items.map((line) => line.reference)).toEqual(['REF1'])
    expect(pendientes.totalItems).toBe(1)
  })
})
```

- [ ] **Paso 5: Implementar el repositorio de extractos**

La deduplicación la hace la base con `skipDuplicates`, que se apoya en el índice único
`[bankAccountId, hash]`. Consultar primero qué hashes existen y después insertar dejaría una
ventana entre las dos consultas; así la decisión y la escritura son la misma operación, y el
conteo de duplicadas sale de la resta.

```ts
async save(
  statement: { id: string; bankAccountId: string; fileName: string },
  lines: readonly ParsedLine[],
): Promise<{ imported: number; duplicated: number }> {
  const rows = lines.map((line) => ({
    statementId: statement.id,
    bankAccountId: statement.bankAccountId,
    date: line.date,
    description: line.description,
    reference: line.reference,
    amountMinor: line.amount.minorUnits,
    currency: line.amount.currency,
    hash: hashOfLine(statement.bankAccountId, line),
  }))

  return this.prisma.$transaction(async (tx) => {
    await tx.bankStatement.create({
      data: {
        id: statement.id,
        bankAccountId: statement.bankAccountId,
        fileName: statement.fileName,
        lineCount: 0,
        duplicateCount: 0,
      },
    })

    // skipDuplicates se apoya en el índice único: cubre tanto las líneas que ya estaban de un
    // extracto anterior como las repetidas dentro del mismo archivo.
    const { count } = await tx.bankLine.createMany({ data: rows, skipDuplicates: true })

    await tx.bankStatement.update({
      where: { id: statement.id },
      data: { lineCount: count, duplicateCount: rows.length - count },
    })

    return { imported: count, duplicated: rows.length - count }
  })
}

// Paginada: un extracto de un mes movido trae cientos de líneas, y la regla del proyecto es
// que toda lista se pagina.
async pendingLines(
  bankAccountId: string,
  range: DateRange,
  page: number,
  pageSize: number,
): Promise<{ items: StoredBankLine[]; totalItems: number }> {
  const where = {
    bankAccountId,
    status: 'PENDING' as const,
    date: { gte: range.from, lte: range.to },
  }

  const [rows, totalItems] = await Promise.all([
    this.prisma.bankLine.findMany({
      where,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    this.prisma.bankLine.count({ where }),
  ])

  return { items: rows.map(bankLineToDomain), totalItems }
}

async findLine(id: string): Promise<StoredBankLine | null> {
  const row = await this.prisma.bankLine.findUnique({ where: { id } })
  return row ? bankLineToDomain(row) : null
}

async markMatched(lineId: string, movementId: string): Promise<void> {
  await this.prisma.bankLine.update({
    where: { id: lineId },
    data: { status: 'MATCHED', movementId },
  })
}

async markPending(lineId: string): Promise<void> {
  await this.prisma.bankLine.update({
    where: { id: lineId },
    data: { status: 'PENDING', movementId: null },
  })
}

async markIgnored(lineId: string): Promise<void> {
  await this.prisma.bankLine.update({
    where: { id: lineId },
    data: { status: 'IGNORED', movementId: null },
  })
}
```

- [ ] **Paso 6: Los dos CRUD de cuentas y perfiles**

`ManageBankAccountsUseCase` y `ManageImportProfilesUseCase` siguen el patrón de
`ManageCategoriesUseCase` de contabilidad: `list`, `find`, `create`, `update`, con
`SemanticValidationError` cuando el agregado rechaza, y `NotFoundError` cuando el id no existe.

La única regla propia es que la cuenta contable de una cuenta bancaria tiene que aceptar
asientos:

```ts
const chart = await this.accounts.loadChart()
if (!chart.isPostable(props.accountCode)) {
  throw new SemanticValidationError(
    `La cuenta ${props.accountCode} no acepta asientos: es agrupadora o está inactiva.`,
  )
}
```

Los controladores exponen `GET|POST /bank-accounts`, `GET|PATCH /bank-accounts/:id`,
`GET|POST /import-profiles` y `GET|PATCH /import-profiles/:id`, con esquemas Zod en
`banking.schemas.ts` y `title` en cada `meta`, como manda la regla 10 de backend.

- [ ] **Paso 7: Verificar y commitear**

```bash
cd api && npm test -- banking && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: cuentas bancarias, perfiles y extractos con identidad por contenido"
```

**Acceptance criteria:**
- [ ] Reimportar el mismo archivo reporta 0 importadas y N duplicadas
- [ ] Dos extractos solapados suman solo lo nuevo
- [ ] La misma línea en otra cuenta bancaria entra
- [ ] La unicidad está en la base, no solo en el código
- [ ] Una cuenta bancaria apuntando a una agrupadora es rechazada con 422

---

### Tarea 4: Importación con vista previa

**Descripción:** Los dos endpoints que reciben el archivo. La vista previa no guarda nada: existe
para que un perfil mal mapeado se vea antes y no después de meter cien líneas torcidas.

**Alcance:** M · **Dependencias:** Tarea 3

**Files:**
- Create: `api/src/modules/banking/application/import-statement.use-case.ts`,
  `preview-statement.use-case.ts`
- Create: `api/src/modules/banking/infrastructure/bank-statements.controller.ts`,
  `banking.schemas.ts`, `uploaded-file.ts`
- Create: `api/src/modules/banking/banking.module.ts`
- Modify: `api/src/app.module.ts`, `api/src/main.ts`
- Test: `api/src/modules/banking/infrastructure/bank-statements.controller.spec.ts`

**Interfaces:**
- Produces:
  - `interface UploadedFile { originalname: string; buffer: Buffer }`
  - `PreviewStatementUseCase.execute(file: UploadedFile, bankAccountId: string, profileId: string): Promise<ParsedLine[]>`
  - `ImportStatementUseCase.execute(file, bankAccountId, profileId): Promise<{ statementId: string; imported: number; duplicated: number }>`
  - `POST /api/v1/bank-statements/preview` y `POST /api/v1/bank-statements`, ambos `multipart/form-data`

- [ ] **Paso 1: El tipo del archivo subido, sin `@types/multer`**

`uploaded-file.ts`:

```ts
// La forma mínima que se usa de lo que entrega multer. Declararla acá evita sumar
// `@types/multer` por dos campos, y deja explícito qué se consume del archivo.
export interface UploadedFile {
  readonly originalname: string
  readonly buffer: Buffer
}
```

- [ ] **Paso 2: Escribir el test de punta a punta que falla**

```ts
describe('importación de extractos', () => {
  it('la vista previa devuelve las líneas sin guardar nada', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bank-statements/preview')
      .field('bankAccountId', cuenta.id)
      .field('profileId', perfil.id)
      .attach('file', Buffer.from(CSV), 'extracto.csv')

    expect(response.status).toBe(200)
    expect(response.body.lines).toHaveLength(3)
    expect(await prisma.bankLine.count()).toBe(0)
  })

  it('importar guarda las líneas y reporta cuántas entraron', async () => {
    const response = await subir(CSV)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ imported: 3, duplicated: 0 })
  })

  it('importar dos veces el mismo archivo no duplica', async () => {
    await subir(CSV)
    const segunda = await subir(CSV)

    expect(segunda.body).toMatchObject({ imported: 0, duplicated: 3 })
    expect(await prisma.bankLine.count()).toBe(3)
  })

  it('un CSV que no coincide con el perfil responde 422 diciendo la fila', async () => {
    const response = await subir('Fecha,Desc,Ref,Monto\nno-es-fecha,X,,100\n')

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('fila 1')
  })

  it('un archivo vacío responde 422 y no crea el extracto', async () => {
    const response = await subir('')

    expect(response.status).toBe(422)
    expect(await prisma.bankStatement.count()).toBe(0)
  })

  it('la moneda de la cuenta bancaria es la de las líneas', async () => {
    await subir(CSV)
    const linea = await prisma.bankLine.findFirst()

    expect(linea?.currency).toBe('CRC')
  })
})
```

- [ ] **Paso 3: Implementar los casos de uso y el controlador**

El controlador usa `FileInterceptor` de `@nestjs/platform-express`, que ya está instalado, y
decodifica el buffer con la codificación del perfil:

```ts
const text = file.buffer.toString(profile.encoding === 'latin1' ? 'latin1' : 'utf-8')
```

Un archivo sin ninguna línea legible es `SemanticValidationError`: importar cero líneas en
silencio dejaría a Emilio creyendo que el banco no tuvo movimientos.

- [ ] **Paso 4: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: importación de extractos con vista previa del mapeo"
```

**Acceptance criteria:**
- [ ] La vista previa no escribe en la base
- [ ] Importar dos veces el mismo archivo no duplica
- [ ] Un CSV que no coincide con el perfil responde 422 con la fila
- [ ] Un archivo vacío no crea el extracto
- [ ] La codificación del perfil se respeta

---

### Tarea 5: Conciliación

**Descripción:** El cruce entre las líneas del banco y los movimientos ya registrados. Función
pura con puntaje y razón, más los tres saldos que la pantalla necesita.

**Alcance:** L · **Dependencias:** Tarea 4

**Files:**
- Create: `api/src/modules/banking/domain/reconciliation.ts`
- Create: `api/src/modules/banking/application/reconcile.use-case.ts`
- Create: `api/src/modules/banking/infrastructure/reconciliation.controller.ts`
- Test: `api/src/modules/banking/domain/reconciliation.spec.ts`

**Interfaces:**
- Produces:
  - `type MatchReason = 'EXACT' | 'NEAR_DATE' | 'REFERENCE'`
  - `interface MatchSuggestion { lineId: string; movementId: string; score: number; reason: MatchReason; ambiguous: boolean }`
  - `suggestMatches(lines: readonly StoredBankLine[], candidates: readonly MovementCandidate[]): MatchSuggestion[]`
  - `interface MovementCandidate { id: string; date: Date; amount: Money; receiptUrl: string | null; kind: 'EXPENSE' | 'INCOME' }`

- [ ] **Paso 1: Escribir el test que falla**

```ts
describe('suggestMatches', () => {
  it('una línea y un movimiento con mismo monto y misma fecha es coincidencia exacta', () => {
    const [match] = suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [
      movimiento('m1', '2026-09-15', 45_000_00n),
    ])

    expect(match).toMatchObject({ lineId: 'l1', movementId: 'm1', score: 100, reason: 'EXACT' })
  })

  it('el mismo monto hasta tres días después sigue siendo coincidencia', () => {
    const [match] = suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [
      movimiento('m1', '2026-09-17', 45_000_00n),
    ])

    expect(match).toMatchObject({ score: 80, reason: 'NEAR_DATE' })
  })

  it('más de tres días ya no coincide por fecha', () => {
    expect(
      suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [
        movimiento('m1', '2026-09-25', 45_000_00n),
      ]),
    ).toEqual([])
  })

  it('la referencia del banco dentro del comprobante coincide aunque cambie el monto', () => {
    const [match] = suggestMatches([linea('l1', '2026-09-15', -45_000_00n, 'REF123')], [
      movimiento('m1', '2026-09-15', 44_000_00n, 'factura REF123'),
    ])

    expect(match).toMatchObject({ reason: 'REFERENCE', score: 70 })
  })

  it('un gasto del banco no se cruza con un ingreso del mismo monto', () => {
    // La línea negativa sale de la cuenta: solo puede ser un gasto.
    expect(
      suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [
        movimiento('m1', '2026-09-15', 45_000_00n, null, 'INCOME'),
      ]),
    ).toEqual([])
  })

  it('un movimiento ya sugerido para una línea no se ofrece para otra', () => {
    const matches = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n), linea('l2', '2026-09-15', -45_000_00n)],
      [movimiento('m1', '2026-09-15', 45_000_00n)],
    )

    expect(matches).toHaveLength(1)
  })

  it('dos candidatos con el mismo puntaje se devuelven marcados como ambiguos', () => {
    const matches = suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [
      movimiento('m1', '2026-09-15', 45_000_00n),
      movimiento('m2', '2026-09-15', 45_000_00n),
    ])

    expect(matches).toHaveLength(2)
    expect(matches.every((match) => match.ambiguous)).toBe(true)
  })

  it('la coincidencia exacta gana sobre la cercana', () => {
    const [match] = suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [
      movimiento('m1', '2026-09-17', 45_000_00n),
      movimiento('m2', '2026-09-15', 45_000_00n),
    ])

    expect(match?.movementId).toBe('m2')
  })

  it('sin candidatos no inventa sugerencias', () => {
    expect(suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [])).toEqual([])
  })
})
```

- [ ] **Paso 2: Implementar**

`api/src/modules/banking/domain/reconciliation.ts`:

```ts
import type { Money } from '../../../shared/kernel/money.js'
import type { StoredBankLine } from './bank-line.js'

export type MatchReason = 'EXACT' | 'NEAR_DATE' | 'REFERENCE'

export interface MovementCandidate {
  readonly id: string
  readonly date: Date
  readonly amount: Money
  readonly receiptUrl: string | null
  readonly kind: 'EXPENSE' | 'INCOME'
}

export interface MatchSuggestion {
  readonly lineId: string
  readonly movementId: string
  readonly score: number
  readonly reason: MatchReason
  readonly ambiguous: boolean
}

const NEAR_DAYS = 3
const MS_PER_DAY = 86_400_000

const daysApart = (a: Date, b: Date): number =>
  Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY

// El signo de la línea decide qué puede ser: lo que sale de la cuenta solo puede ser un gasto.
const kindOf = (line: StoredBankLine): 'EXPENSE' | 'INCOME' =>
  line.amount.isNegative() ? 'EXPENSE' : 'INCOME'

const sameAmount = (line: StoredBankLine, candidate: MovementCandidate): boolean => {
  const magnitude = line.amount.isNegative() ? line.amount.negate() : line.amount
  return magnitude.equals(candidate.amount)
}

const scoreOf = (
  line: StoredBankLine,
  candidate: MovementCandidate,
): { score: number; reason: MatchReason } | null => {
  if (kindOf(line) !== candidate.kind) return null

  if (sameAmount(line, candidate)) {
    if (daysApart(line.date, candidate.date) === 0) return { score: 100, reason: 'EXACT' }
    if (daysApart(line.date, candidate.date) <= NEAR_DAYS) return { score: 80, reason: 'NEAR_DATE' }
  }

  const reference = line.reference?.trim()
  if (reference && candidate.receiptUrl?.includes(reference)) {
    return { score: 70, reason: 'REFERENCE' }
  }

  return null
}

// Se arman todos los pares posibles, se ordenan por puntaje y se van tomando mientras ni la
// línea ni el movimiento estén ya tomados. Cuando dos candidatos empatan en el mejor puntaje de
// una línea, salen los dos marcados como ambiguos: ofrecer uno solo y esconder el otro sería
// elegir por Emilio sin decírselo.
export const suggestMatches = (
  lines: readonly StoredBankLine[],
  candidates: readonly MovementCandidate[],
): MatchSuggestion[] => {
  const pairs = lines.flatMap((line) =>
    candidates.flatMap((candidate) => {
      const scored = scoreOf(line, candidate)
      return scored ? [{ line, candidate, ...scored }] : []
    }),
  )

  pairs.sort((a, b) => b.score - a.score || a.line.id.localeCompare(b.line.id))

  const takenLines = new Set<string>()
  const takenMovements = new Set<string>()
  const suggestions: MatchSuggestion[] = []

  for (const pair of pairs) {
    if (takenLines.has(pair.line.id) || takenMovements.has(pair.candidate.id)) continue

    const tied = pairs.filter(
      (other) =>
        other.line.id === pair.line.id &&
        other.score === pair.score &&
        other.candidate.id !== pair.candidate.id &&
        !takenMovements.has(other.candidate.id),
    )

    suggestions.push({
      lineId: pair.line.id,
      movementId: pair.candidate.id,
      score: pair.score,
      reason: pair.reason,
      ambiguous: tied.length > 0,
    })

    for (const other of tied) {
      suggestions.push({
        lineId: other.line.id,
        movementId: other.candidate.id,
        score: other.score,
        reason: other.reason,
        ambiguous: true,
      })
      takenMovements.add(other.candidate.id)
    }

    takenLines.add(pair.line.id)
    takenMovements.add(pair.candidate.id)
  }

  return suggestions
}
```

- [ ] **Paso 3: Caso de uso y los tres saldos**

`ReconcileUseCase.execute(bankAccountId, range, page, pageSize)` devuelve las líneas pendientes, las sugerencias,
y tres montos: el saldo contable de la cuenta a la fecha final —`totalsUpTo` del repositorio de
asientos, que ya existe—, el saldo del extracto —la suma de las líneas importadas— y la
diferencia. Con todo conciliado la diferencia es cero.

- [ ] **Paso 4: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: sugerencias de conciliación con puntaje y razón"
```

**Acceptance criteria:**
- [ ] Un gasto del banco no se cruza con un ingreso
- [ ] Un movimiento se sugiere para una sola línea
- [ ] El empate se devuelve marcado como ambiguo, no resuelto al azar
- [ ] La exacta gana sobre la cercana
- [ ] Los tres saldos cuadran cuando todo está conciliado

---

### Tarea 6: Acciones sobre las líneas

**Descripción:** Confirmar, deshacer, ignorar, y convertir una línea en movimiento. Es donde el
módulo toca la contabilidad, y lo hace por la puerta que ya existe.

**Alcance:** M · **Dependencias:** Tarea 5

**Files:**
- Create: `api/src/modules/banking/application/match-line.use-case.ts`,
  `line-to-movement.use-case.ts`
- Modify: `api/src/modules/banking/infrastructure/reconciliation.controller.ts`
- Modify: `api/src/modules/accounting/accounting.module.ts` (exportar `CreateMovementUseCase`)
- Test: `api/src/modules/banking/infrastructure/reconciliation.controller.spec.ts`

**Interfaces:**
- Consumes: `CreateMovementUseCase` de `accounting`
- Produces:
  - `MatchLineUseCase.execute(lineId: string, movementId: string): Promise<void>`
  - `UnmatchUseCase.execute(lineId: string): Promise<void>`
  - `IgnoreLineUseCase.execute(lineId: string): Promise<void>`
  - `LineToMovementUseCase.execute(lineId: string, input: { categoryId: string; counterparty?: string }): Promise<{ movementId: string }>`

- [ ] **Paso 1: Escribir el test de punta a punta que falla**

```ts
describe('acciones de conciliación', () => {
  it('confirmar deja la línea conciliada con su movimiento', async () => {
    await post(`/bank-lines/${linea.id}/match`, { movementId: movimiento.id })

    const actualizada = await prisma.bankLine.findUnique({ where: { id: linea.id } })
    expect(actualizada?.status).toBe('MATCHED')
    expect(actualizada?.movementId).toBe(movimiento.id)
  })

  it('confirmar dos líneas contra el mismo movimiento responde 409', async () => {
    await post(`/bank-lines/${l1.id}/match`, { movementId: movimiento.id }).expect(200)

    const segunda = await post(`/bank-lines/${l2.id}/match`, { movementId: movimiento.id })

    expect(segunda.status).toBe(409)
  })

  it('deshacer devuelve la línea a pendiente', async () => {
    await post(`/bank-lines/${linea.id}/match`, { movementId: movimiento.id })
    await post(`/bank-lines/${linea.id}/unmatch`, {}).expect(200)

    const actualizada = await prisma.bankLine.findUnique({ where: { id: linea.id } })
    expect(actualizada?.status).toBe('PENDING')
    expect(actualizada?.movementId).toBeNull()
  })

  it('ignorar saca la línea de pendientes sin crear nada', async () => {
    await post(`/bank-lines/${linea.id}/ignore`, {}).expect(200)

    expect(await prisma.movement.count()).toBe(0)
  })

  it('convertir una línea en movimiento crea el movimiento, su asiento y la concilia', async () => {
    const response = await post(`/bank-lines/${linea.id}/to-movement`, {
      categoryId: categoria.id,
    })

    expect(response.status).toBe(201)
    expect(await prisma.journalEntry.count()).toBe(1)

    const actualizada = await prisma.bankLine.findUnique({ where: { id: linea.id } })
    expect(actualizada?.status).toBe('MATCHED')
  })

  it('el movimiento creado toma la fecha, el monto y la cuenta de la línea', async () => {
    await post(`/bank-lines/${linea.id}/to-movement`, { categoryId: categoria.id }).expect(201)
    const movimiento = await prisma.movement.findFirst()

    expect(movimiento?.date.toISOString().slice(0, 10)).toBe('2026-09-15')
    expect(movimiento?.amountMinor).toBe(45_000_00n)
    expect(movimiento?.paymentAccountCode).toBe('1111')
  })

  it('convertir una línea de un mes cerrado responde 409', async () => {
    await cerrarPeriodoDeLaLinea()

    const response = await post(`/bank-lines/${linea.id}/to-movement`, {
      categoryId: categoria.id,
    })

    expect(response.status).toBe(409)
  })

  it('una línea ya conciliada no se puede convertir otra vez', async () => {
    await post(`/bank-lines/${linea.id}/to-movement`, { categoryId: categoria.id }).expect(201)

    const segunda = await post(`/bank-lines/${linea.id}/to-movement`, { categoryId: categoria.id })

    expect(segunda.status).toBe(409)
  })
})
```

El caso del período cerrado es el que prueba la decisión 1: la línea no escribe el asiento por su
cuenta, así que hereda el guardián sin que el módulo `banking` sepa que existe.

- [ ] **Paso 2: Implementar**

```ts
@Injectable()
export class LineToMovementUseCase {
  constructor(
    @Inject(BANK_STATEMENT_REPOSITORY) private readonly statements: BankStatementRepository,
    @Inject(BANK_ACCOUNT_REPOSITORY) private readonly accounts: BankAccountRepository,
    // El módulo no escribe asientos: entra por la misma puerta que la carga manual, y así
    // hereda el guardián de período sin conocerlo.
    private readonly createMovement: CreateMovementUseCase,
  ) {}

  async execute(
    lineId: string,
    input: { categoryId: string; counterparty?: string },
  ): Promise<{ movementId: string }> {
    const line = await this.statements.findLine(lineId)
    if (!line) throw new NotFoundError(`La línea ${lineId} no existe.`)
    if (line.status !== 'PENDING') {
      throw new ConflictError('Esa línea ya está conciliada o ignorada.')
    }

    const account = await this.accounts.findById(line.bankAccountId)
    if (!account) throw new NotFoundError('La cuenta bancaria de la línea no existe.')

    // Un movimiento siempre es positivo: el signo del extracto define la dirección, no el monto.
    const magnitude = line.amount.isNegative() ? line.amount.negate() : line.amount

    const { movement } = await this.createMovement.execute({
      date: line.date.toISOString().slice(0, 10),
      kind: line.amount.isNegative() ? 'EXPENSE' : 'INCOME',
      categoryId: input.categoryId,
      counterparty: input.counterparty ?? line.description,
      amount: { minorUnits: magnitude.minorUnits.toString(), currency: magnitude.currency },
      paymentAccountCode: account.accountCode,
      receiptUrl: null,
    })

    await this.statements.markMatched(lineId, movement.id)
    return { movementId: movement.id }
  }
}
```

`MatchLineUseCase` valida que la línea esté pendiente y que el movimiento no esté ya tomado por
otra línea —`ConflictError` si lo está— y llama a `markMatched`. `UnmatchUseCase` y
`IgnoreLineUseCase` son `markPending` y `markIgnored` sobre el mismo repositorio.

- [ ] **Paso 3: Verificar y commitear**

```bash
cd api && npm test && npm run typecheck && npm run lint
git add api
git commit -m "✨ feat: confirmar, deshacer, ignorar y convertir líneas en movimientos"
```

**Acceptance criteria:**
- [ ] Un movimiento no se puede conciliar con dos líneas
- [ ] Deshacer devuelve la línea a pendiente
- [ ] Convertir crea movimiento y asiento, y concilia la línea
- [ ] Una línea de un mes cerrado responde 409
- [ ] Una línea ya conciliada no se convierte dos veces

---

### Tarea 7: Pantallas

**Descripción:** Tres vistas: cuentas bancarias con sus perfiles, importación con vista previa, y
la conciliación, que es la que importa.

**Alcance:** L · **Dependencias:** Tarea 6

**Files:**
- Create: `web/src/routes/banco.cuentas.tsx`, `banco.importar.tsx`, `banco.conciliacion.tsx`
- Create: `web/src/features/banking/` — `copy.ts`, `types.ts`, `use-banking.ts`, componentes
- Modify: `web/src/components/app-sidebar.tsx`, `page-breadcrumb.tsx`

- [ ] **Paso 1: Copy y composición**

Regenerar tipos con `npm run api:types`. Todo el texto con `copywriting`, en
`web/src/features/banking/copy.ts`. Resolver la composición con `impeccable shape` antes del JSX.

La pantalla de conciliación no puede ser una tabla de líneas: la unidad es **la pareja**, línea del
banco a la izquierda y movimiento sugerido a la derecha, con la razón de la sugerencia entre las
dos y las acciones al lado. Una tabla de líneas obligaría a buscar el movimiento en otra parte,
que es exactamente el trabajo que la pantalla existe para evitar.

- [ ] **Paso 2: Importación**

Subida con vista previa obligatoria: se elige cuenta y perfil, se sube el archivo, se ven las
primeras filas ya interpretadas —fecha, descripción, monto— y recién ahí aparece el botón de
importar. Si el perfil está mal mapeado, se ve en la vista previa y no después.

El resultado dice cuántas entraron y cuántas se descartaron por duplicadas. Que diga «0 nuevas, 47
duplicadas» es información, no un error: significa que ese archivo ya estaba.

- [ ] **Paso 3: Conciliación**

Arriba los tres saldos —contable, extracto, diferencia—, con la diferencia siempre a la vista.
Debajo, las parejas. Una sugerencia ambigua muestra las dos opciones y obliga a elegir; no se
resuelve sola.

Cada línea sin sugerencia ofrece convertirla en movimiento, con un selector de categoría. Ese es
el camino más recorrido de la pantalla y tiene que costar dos clics.

Bajo 768 px la pareja se apila: línea arriba, sugerencia abajo, acciones al final.

- [ ] **Paso 4: Puerta de calidad**

Capturas a 360, 768 y 1440 px en los dos temas, `impeccable critique`, `audit` y `polish`.

- [ ] **Paso 5: Verificar y commitear**

```bash
cd web && npm test && npm run typecheck && npm run build
git add web
git commit -m "✨ feat: pantallas de cuentas bancarias, importación y conciliación"
```

**Acceptance criteria:**
- [ ] La vista previa aparece antes del botón de importar
- [ ] Los tres saldos están siempre visibles
- [ ] Una sugerencia ambigua muestra las dos opciones
- [ ] Convertir una línea en movimiento cuesta dos clics
- [ ] Ninguna pantalla con desplazamiento horizontal a 360 px

---

### Checkpoint: fase 2 completa

- [ ] `cd api && npm test` y `cd web && npm test` en verde
- [ ] Un CSV real importado deja la diferencia entre saldo contable y saldo del banco explicada
- [ ] Reimportar el mismo archivo no cambia nada
- [ ] Una línea del banco no anotada se convierte en movimiento y aparece en el mayor
- [ ] Revisión con Emilio

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El CSV real no se parece a ningún perfil | Alto | El perfil es dato: se ajusta en la pantalla sin tocar código, y la vista previa lo confirma antes de importar |
| Dos movimientos idénticos el mismo día | Medio | Las dos sugerencias salen marcadas como ambiguas y decide Emilio |
| Latin1 leído como UTF-8 | Bajo | La codificación es parte del perfil y la vista previa la delata |
| La conciliación escribe asientos por su cuenta | Alto | `LineToMovementUseCase` llama a `CreateMovementUseCase`; el test del período cerrado lo prueba |

## Preguntas abiertas

- Ninguna bloqueante. El formato real de los extractos se resuelve creando un perfil, que es dato.
