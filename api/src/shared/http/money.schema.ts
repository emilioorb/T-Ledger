import { z } from 'zod'
import { CURRENCIES } from '../kernel/currency.js'
import { Money } from '../kernel/money.js'

// En el borde un monto viaja como string para no pasar por el doble de JavaScript.
export const moneySchema = z
  .object({
    minorUnits: z.string().regex(/^-?\d+$/, { error: 'El monto debe ser un entero en unidades mínimas' }),
    currency: z.enum(CURRENCIES),
  })
  .meta({ title: 'Money' })

export type MoneyDto = z.infer<typeof moneySchema>

export const toMoney = (dto: MoneyDto): Money =>
  Money.fromMinorUnits(BigInt(dto.minorUnits), dto.currency)

export const fromMoney = (money: Money): MoneyDto => money.toJSON()
