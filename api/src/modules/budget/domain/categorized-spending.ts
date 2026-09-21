import type { Money } from '../../../shared/kernel/money.js'

// Lo resuelve un proveedor que agrega los asientos del período por cuenta contable, a través
// del mapeo categoría a cuenta de la rebanada 3. La interfaz existe para poder cambiar la
// fuente del gasto sin tocar el dominio de presupuesto.
export interface CategorizedSpending {
  amountFor(bucketId: string): Money
}
