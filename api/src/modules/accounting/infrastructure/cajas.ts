import type { CurrencyCode } from '../../../shared/kernel/currency.js'

// Las cuentas no tienen moneda: la caja en colones y la caja en dólares se distinguen solo por
// el código que les da la semilla. Esto lo deja escrito en un lugar, al lado de la semilla, y
// su test falla si la semilla cambia sin avisar.
export const CAJAS: Readonly<Record<string, CurrencyCode>> = { '1101': 'CRC', '1102': 'USD' }
