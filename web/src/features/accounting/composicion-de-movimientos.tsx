import { useMemo } from 'react'
import { formatMoney } from '@/lib/money'
import { BarraDeComposicion, type Tramo } from './barra-de-composicion'
import { copy } from './copy'
import type { Category, CategoryTotal, CurrencyCode, MovementFilters } from './types'
import { useMovementTotals } from './use-accounting'

interface Grupo {
  currency: CurrencyCode
  tramos: Tramo[]
}

const suma = (totales: CategoryTotal[]): bigint =>
  totales.reduce((acumulado, { total }) => acumulado + BigInt(total.minorUnits), 0n)

// Una barra por moneda y no una sola con todo adentro: sumar colones con dólares da un número
// que no existe. Con una moneda, que es el caso normal, se ve una sola barra.
const agrupar = (totales: CategoryTotal[], categorias: Category[]): Grupo[] => {
  const porCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria]))
  const monedas = [...new Set(totales.map(({ total }) => total.currency))]

  return monedas
    .map((currency) => {
      const propios = totales.filter(({ total }) => total.currency === currency)
      const totalMinor = suma(propios)

      return {
        currency,
        tramos: propios.map(({ categoryId, total }): Tramo => {
          const categoria = porCategoria.get(categoryId)
          const nombre = categoria?.name ?? copy.movements.composition.uncategorized
          const parte = totalMinor > 0n ? Number(BigInt(total.minorUnits)) / Number(totalMinor) : 0

          return {
            id: categoryId,
            nombre,
            parte,
            colorIndex: categoria?.colorIndex ?? null,
            ...(categoria ? { posicion: categoria.sortOrder } : {}),
            detalle: `${nombre} · ${formatMoney(total)} · ${Math.round(parte * 100)}%`,
          }
        }),
      }
    })
    .filter((grupo) => grupo.tramos.length > 0)
}

interface Props {
  filters: MovementFilters
  categories: Category[]
}

// Lo que la tabla de abajo muestra fila por fila, visto de una. Se dibuja con el resumen que
// devuelve el servidor para el filtro entero, no con la página cargada: la página son
// veinticinco movimientos y el filtro puede ser un año.
//
// Sin leyenda ni total: la tabla ya nombra cada categoría y cada monto, y repetirlos arriba
// sería decir dos veces lo mismo en la pantalla que menos lugar tiene para eso. Lo que ata un
// tramo con su fila es el punto de color de la columna «Categoría», y el monto exacto está a
// un hover de distancia.
//
// Los anulados no entran, porque no se gastaron. Y si el filtro pide justamente los anulados,
// no aparece nada: una barra que resume otras filas que las de la tabla es peor que ninguna.
export const ComposicionDeMovimientos = ({ filters, categories }: Props) => {
  const { data } = useMovementTotals(filters)
  const grupos = useMemo(() => agrupar(data ?? [], categories), [data, categories])

  if (grupos.length === 0) return null

  return (
    <div className="space-y-1">
      {grupos.map((grupo) => (
        <BarraDeComposicion
          key={grupo.currency}
          tramos={grupo.tramos}
          label={copy.movements.composition.label(
            grupo.tramos.map((tramo) => `${tramo.nombre} ${Math.round(tramo.parte * 100)}%`),
          )}
        />
      ))}
    </div>
  )
}
