import { useQueries } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { monthEnd, monthStart } from '@/lib/dates'
import type { CurrencyCode, IncomeStatement } from './types'

export interface MonthResult {
  period: string
  statement: IncomeStatement | undefined
}

// Los meses hacia atrás, del más viejo al más nuevo: un gráfico de tiempo se lee de
// izquierda a derecha, y el mes en curso va al final porque todavía está pasando.
const lastMonths = (count: number, from: string): string[] => {
  const [year, month] = from.split('-').map(Number)
  if (!year || !month) return []

  return Array.from({ length: count }, (_, index) => {
    const offset = month - (count - 1 - index)
    const shift = Math.floor((offset - 1) / 12)
    const normalized = ((((offset - 1) % 12) + 12) % 12) + 1
    return `${year + shift}-${String(normalized).padStart(2, '0')}`
  })
}

// Un reporte por mes: el estado de resultados contesta un rango, no una serie. Con seis
// meses son seis consultas que el caché comparte con la pantalla de Resultados.
export const useMonthlyResults = (count: number, currency: CurrencyCode, from: string) => {
  const periods = lastMonths(count, from.slice(0, 7))

  return useQueries({
    queries: periods.map((period) => {
      const start = monthStart(`${period}-01`)
      const end = monthEnd(`${period}-01`)
      return {
        queryKey: queryKeys.accounting.incomeStatement(currency, start, end),
        queryFn: () =>
          apiFetch<IncomeStatement>(
            `/reports/income-statement?currency=${currency}&from=${start}&to=${end}`,
          ),
      }
    }),
    combine: (results): MonthResult[] =>
      results.map((result, index) => ({
        period: periods[index] ?? '',
        statement: result.data,
      })),
  })
}
