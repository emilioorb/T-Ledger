import { z } from 'zod'
import { CURRENCIES } from '../kernel/currency.js'
import { Money } from '../kernel/money.js'

// El techo no es una preferencia de producto: `SUM(amountMinor)::bigint` de los reportes
// desborda int8 (~9,2 × 10^18) y desde ahí el patrimonio responde 500 para siempre, sin
// forma de deshacerlo por API. Un billón en unidades mínimas deja margen para millones de
// asientos y sigue siendo absurdo para finanzas personales.
export const MAX_MINOR_UNITS = 100_000_000_000_000n

const ENTERO = /^-?\d+$/

// Zod corre todos los checks de un mismo string para poder reportar todos los errores de una,
// así que este refine recibe el valor aunque el regex de arriba ya lo haya rechazado. Sin esta
// guarda, `BigInt('lo que sea')` tira una excepción que nadie atrapa: el endpoint responde 500
// en vez de 400, y el monto que escribió la persona termina dentro del mensaje del error, que
// es por donde se escapó uno a Sentry el 21/09/2026.
//
// Devuelve `true` cuando el formato es inválido porque de ese error ya se encarga el regex:
// este check solo opina del rango.
const withinRange = (minorUnits: string): boolean => {
  if (!ENTERO.test(minorUnits)) return true
  const value = BigInt(minorUnits)
  return value <= MAX_MINOR_UNITS && value >= -MAX_MINOR_UNITS
}

// En el borde un monto viaja como string para no pasar por el doble de JavaScript.
export const moneySchema = z
  .object({
    minorUnits: z
      .string()
      .regex(ENTERO, { error: 'El monto debe ser un entero en unidades mínimas' })
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
