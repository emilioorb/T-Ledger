import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'
export type SortValue = string | number | bigint

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

export const compareValues = (a: SortValue, b: SortValue): number => {
  if (typeof a === 'string' || typeof b === 'string') {
    return collator.compare(String(a), String(b))
  }
  // Los montos viajan en unidades mínimas como bigint: restarlos y convertir a Number
  // los aplastaría, así que se comparan y se devuelve el signo.
  if (a === b) return 0
  return a < b ? -1 : 1
}

export const sortRows = <T>(
  rows: readonly T[],
  accessor: (row: T) => SortValue,
  direction: SortDirection,
): T[] => {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => sign * compareValues(accessor(a), accessor(b)))
}

// Sin acentos ni mayúsculas: buscar «papas» tiene que encontrar «Papás».
const normalize = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export const filterRows = <T>(
  rows: readonly T[],
  searchable: (row: T) => string,
  query: string,
): T[] => {
  const needle = normalize(query.trim())
  if (needle.length === 0) return [...rows]
  return rows.filter((row) => normalize(searchable(row)).includes(needle))
}

interface Options<T, K extends string> {
  rows: readonly T[]
  columns: Record<K, (row: T) => SortValue>
  initial: SortState<K>
  searchable?: (row: T) => string
}

export const useTableControls = <T, K extends string>({
  rows,
  columns,
  initial,
  searchable,
}: Options<T, K>) => {
  const [sort, setSort] = useState<SortState<K>>(initial)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const filtered = searchable ? filterRows(rows, searchable, query) : [...rows]
    return sortRows(filtered, columns[sort.key], sort.direction)
  }, [rows, columns, sort, query, searchable])

  // Un segundo clic sobre la misma columna invierte; uno sobre otra empieza ascendente.
  const toggle = (key: K) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  // toggle es para el encabezado, que alterna; setSort es para el selector de teléfono,
  // que elige columna y deja la dirección donde estaba.
  const setSortKey = (key: K) => setSort((current) => ({ key, direction: current.direction }))

  return { rows: visible, sort, toggle, setSort: setSortKey, query, setQuery, total: rows.length }
}
