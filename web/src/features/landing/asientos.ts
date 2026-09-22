import type { CurrencyCode, MoneyDto } from '@/lib/money'

const MONEDA: CurrencyCode = 'CRC'

const colones = (minorUnits: string): MoneyDto => ({ minorUnits, currency: MONEDA })

export interface Renglon {
  cuenta: string
  monto: MoneyDto
}

export interface Asiento {
  // Lo que la persona escribiría con sus palabras. En contabilidad esto se llama glosa, y es
  // parte del asiento de verdad: sin ella, dentro de un mes nadie sabe qué fue ese movimiento.
  glosa: string
  debe: Renglon
  haber: Renglon
}

// Tres y no seis: son las tres cosas que el producto hace todos los días —gastar, cobrar y
// abonar— y tres pares es lo que entra en una pantalla sin apretar la tipografía.
//
// Los nombres de cuenta van cortos y no como los del catálogo que trae la app, que dice
// «Efectivo y equivalentes» o «Banco colones»: en la T cada nombre tiene que entrar en un
// renglón al lado de su cifra, y quien lee esta página todavía no sabe qué es un catálogo de
// cuentas. Es el mismo criterio de la cinta de la pantalla de entrar, que escribe «Caja».
export const ASIENTOS: readonly Asiento[] = [
  {
    glosa: 'Gasté 20 mil en el súper',
    debe: { cuenta: 'Mercado', monto: colones('2000000') },
    haber: { cuenta: 'Efectivo', monto: colones('2000000') },
  },
  {
    glosa: 'Me pagaron el salario',
    debe: { cuenta: 'Banco', monto: colones('85000000') },
    haber: { cuenta: 'Salario', monto: colones('85000000') },
  },
  {
    glosa: 'Abono 50 mil a la tarjeta',
    debe: { cuenta: 'Tarjeta', monto: colones('5000000') },
    haber: { cuenta: 'Banco', monto: colones('5000000') },
  },
]

// Con `BigInt` y no con `Number`: los montos vienen en céntimos como texto justamente porque
// un entero de JavaScript no los aguanta, y acá se suman igual que en el resto del producto.
export const totalDe = (asientos: readonly Asiento[], lado: 'debe' | 'haber'): MoneyDto =>
  colones(
    asientos
      .reduce((suma, asiento) => suma + BigInt(asiento[lado].monto.minorUnits), 0n)
      .toString(),
  )
