import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Una consulta cruda no pasa por la extensión que filtra por libro (ADR-002). Pasó: el
// patrimonio de un libro sumaba los asientos de todos. Toda consulta cruda tiene que escribir
// el filtro a mano, en cada tabla, y este test lo exige para las que vengan.
//
// Dos pasos: primero se encuentra cualquier uso de SQL crudo, de cualquier forma; después, cada
// uso tiene que tener la única forma que este test sabe revisar (plantilla etiquetada). Lo que no
// sabe revisar (`Unsafe`, `Prisma.sql`, TypedSQL) falla en vez de pasar sin mirar.
const USO_CRUDO = /\$(queryRaw|executeRaw)\w*|\$queryRawTyped|Prisma\.(raw|sql|join)\b/g
const PLANTILLA = /\$(queryRaw|executeRaw)\s*(<[^`]*?>)?\s*`([^`]*)`/y
const TABLA = /\b(?:FROM|JOIN)\s+"?(\w+)"?\s+(?:AS\s+)?(\w+)/gi
const PALABRAS_SQL = new Set(['where', 'on', 'join', 'left', 'right', 'inner', 'group', 'order', 'limit'])
// Las únicas instrucciones sin tabla que se aceptan: no leen datos de ningún libro. La lista es
// cerrada; cualquier otra sin FROM sigue fallando.
const SIN_TABLA_PERMITIDAS = [/^\s*SELECT set_config\('lock_timeout',/, /^\s*SELECT pg_advisory_xact_lock\(/]
// Catálogos de Postgres, no tablas de un libro: los tests miran ahí quién espera el candado. La
// lista también es cerrada.
const TABLAS_DEL_SISTEMA = new Set(['pg_locks'])

const problemasDe = (codigo: string): string[] =>
  [...codigo.matchAll(USO_CRUDO)].flatMap((uso) => {
    PLANTILLA.lastIndex = uso.index
    const plantilla = PLANTILLA.exec(codigo)
    if (!plantilla) return [`forma que el test no sabe revisar: ${uso[0]}`]
    const sql = plantilla[3] ?? ''
    const tablas = [...sql.matchAll(TABLA)]
    if (tablas.length === 0) {
      return SIN_TABLA_PERMITIDAS.some((permitida) => permitida.test(sql)) ? [] : [`consulta sin FROM que el test pueda leer`]
    }
    const alias = tablas
      .filter(([, tabla]) => !TABLAS_DEL_SISTEMA.has((tabla ?? '').toLowerCase()))
      .map(([, tabla, nombre]) => (nombre && !PALABRAS_SQL.has(nombre.toLowerCase()) ? nombre : tabla))
      .filter((nombre): nombre is string => nombre !== undefined)
    return alias
      .filter((nombre) => !new RegExp(`\\b${nombre}\\."bookId"\\s*=\\s*\\$\\{libro\\}`).test(sql))
      .map((nombre) => `la tabla ${nombre} no filtra por libro`)
  })

const RAIZ = path.resolve(import.meta.dirname, '../../..')
const fuentes = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (statSync(ruta).isDirectory()) return ['generated', 'node_modules'].includes(nombre) ? [] : fuentes(ruta)
    return /\.ts$/.test(nombre) && !/\.spec\.ts$/.test(nombre) ? [ruta] : []
  })

describe('consultas crudas', () => {
  it('todas las del código filtran por libro, tabla por tabla', () => {
    const encontrados = [path.join(RAIZ, 'src'), path.join(RAIZ, 'scripts')].flatMap((dir) =>
      fuentes(dir).flatMap((archivo) =>
        problemasDe(readFileSync(archivo, 'utf8')).map((problema) => `${path.relative(RAIZ, archivo)}: ${problema}`),
      ),
    )

    expect(encontrados).toEqual([])
  })

  it('acepta una consulta que filtra por libro en cada tabla', () => {
    const sql = 'this.prisma.client.$queryRaw<{ n: number }[]>`SELECT 1 FROM journal_lines l JOIN journal_entries e ON e."id" = l."entryId" WHERE l."bookId" = ${libro} AND e."bookId" = ${libro}`'

    expect(problemasDe(sql)).toEqual([])
  })

  it('marca la tabla del JOIN que no filtra', () => {
    const sql = 'this.prisma.client.$queryRaw`SELECT 1 FROM journal_lines l JOIN journal_entries e ON e."id" = l."entryId" WHERE l."bookId" = ${libro}`'

    expect(problemasDe(sql)).toEqual(['la tabla e no filtra por libro'])
  })

  it('no se conforma con cualquier bookId: tiene que ser el del libro activo', () => {
    const sql = 'this.prisma.client.$queryRaw`SELECT 1 FROM journal_lines l WHERE l."bookId" = ${otroId}`'

    expect(problemasDe(sql)).toEqual(['la tabla l no filtra por libro'])
  })

  it('acepta solo las instrucciones sin tabla de la lista: el candado del libro y su tope de espera', () => {
    expect(problemasDe('tx.$executeRaw`SELECT pg_advisory_xact_lock(${ESPACIO}::int, hashtext(${libro}))`')).toEqual([])
    expect(problemasDe("tx.$executeRaw`SELECT set_config('lock_timeout', ${tope}, true)`")).toEqual([])
    expect(problemasDe('tx.$executeRaw`SELECT pg_sleep(1)`')).toHaveLength(1)
    expect(problemasDe("tx.$executeRaw`SELECT set_config('search_path', ${x}, true)`")).toHaveLength(1)
  })

  it('acepta los catálogos del sistema de la lista, y nada más que ellos', () => {
    expect(problemasDe("x.$queryRaw`SELECT count(*) FROM pg_locks l WHERE l.locktype = 'advisory'`")).toEqual([])
    expect(problemasDe('x.$queryRaw`SELECT 1 FROM pg_locks l JOIN journal_lines j ON true`')).toEqual([
      'la tabla j no filtra por libro',
    ])
    expect(problemasDe('x.$queryRaw`SELECT 1 FROM pg_stat_activity a`')).toHaveLength(1)
  })

  it('rechaza las formas que no sabe revisar, en vez de dejarlas pasar', () => {
    expect(problemasDe("this.prisma.client.$queryRawUnsafe('SELECT * FROM journal_lines')")).toHaveLength(1)
    expect(problemasDe('this.prisma.client.$queryRaw(Prisma.sql`SELECT 1`)')).not.toEqual([])
    expect(problemasDe('this.prisma.client.$queryRawTyped(totales())')).toHaveLength(1)
  })
})
