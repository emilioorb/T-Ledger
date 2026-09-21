import { z } from 'zod'
import { CURRENCIES } from '../kernel/currency.js'
import { Money } from '../kernel/money.js'

// El techo no es una preferencia de producto: `SUM(amountMinor)::bigint` de los reportes
// desborda int8 (~9,2 × 10^18) y desde ahí el patrimonio responde 500 para siempre, sin
// forma de deshacerlo por API. Un billón en unidades mínimas deja margen para millones de
// asientos y sigue siendo absurdo para finanzas personales.
export const MAX_MINOR_UNITS = 100_000_000_000_000n

const withinRange = (minorUnits: string): boolean => {
  const value = BigInt(minorUnits)
  return value <= MAX_MINOR_UNITS && value >= -MAX_MINOR_UNITS
}

// En el borde un monto viaja como string para no pasar por el doble de JavaScript.
export const moneySchema = z
  .object({
    minorUnits: z
      .string()
      .regex(/^-?\d+$/, { error: 'El monto debe ser un entero en unidades mínimas' })
      .refine(withinRange, { error: 'El monto supera el máximo que el sistema puede sumar' }),
    currency: z.enum(CURRENCIES),
  })
  .meta({ id: 'Money', title: 'Money' })

// Repartir porcentajes de un ingreso negativo dejaba todas las cubetas al revés, con 200
// y sin una sola queja.
export const nonNegativeMoneySchema = moneySchema
  .refine((money) => !money.minorUnits.startsWith('-'), { error: 'El monto no puede ser negativo' })
  .meta({ id: 'NonNegativeMoney', title: 'NonNegativeMoney' })

export type MoneyDto = z.infer<typeof moneySchema>

export const toMoney = (dto: MoneyDto): Money =>
  Money.fromMinorUnits(BigInt(dto.minorUnits), dto.currency)

export const fromMoney = (money: Money): MoneyDto => money.toJSON()
