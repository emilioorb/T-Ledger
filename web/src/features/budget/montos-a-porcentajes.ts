// Los porcentajes van con dos decimales: la unidad de trabajo es la centésima de punto.
const CENTESIMAS_DEL_TOTAL = 10_000n

const comoTexto = (centesimas: bigint): string => {
  const enteros = centesimas / 100n
  const resto = centesimas % 100n
  if (resto === 0n) return enteros.toString()
  return `${enteros}.${resto.toString().padStart(2, '0').replace(/0$/, '')}`
}

// Cada monto como porcentaje del ingreso. Si los montos suman justo el ingreso, los porcentajes
// suman justo 100: el redondeo se reparte por mayor resto, porque tres cubetas de un tercio dan
// 33,33 cada una y el modelo no se podría guardar por la centésima que falta.
export const montosAPorcentajes = (montos: readonly bigint[], ingreso: bigint): string[] => {
  if (ingreso <= 0n) return montos.map(() => '0')

  const exactos = montos.map((monto) => (monto < 0n ? 0n : monto) * CENTESIMAS_DEL_TOTAL)
  const pisos = exactos.map((exacto) => exacto / ingreso)
  const sumaDeMontos = montos.reduce((acc, monto) => acc + (monto < 0n ? 0n : monto), 0n)

  // Sin llegar al ingreso no hay un 100 que cuidar: cada uno se redondea al más cercano.
  if (sumaDeMontos !== ingreso) {
    return exactos.map((exacto) => comoTexto((exacto * 2n + ingreso) / (2n * ingreso)))
  }

  const faltan = CENTESIMAS_DEL_TOTAL - pisos.reduce((acc, piso) => acc + piso, 0n)
  const porResto = exactos
    .map((exacto, indice) => ({ indice, resto: exacto % ingreso }))
    .sort((a, b) => (a.resto === b.resto ? a.indice - b.indice : a.resto > b.resto ? -1 : 1))
  const conReparto = [...pisos]
  for (const { indice } of porResto.slice(0, Number(faltan))) conReparto[indice] = (conReparto[indice] ?? 0n) + 1n
  return conReparto.map(comoTexto)
}

// La suma en centésimas y no con `Number`: 33.33 + 33.33 + 33.34 en coma flotante no da 100.
export const sumaDePorcentajes = (porcentajes: readonly string[]): number => {
  const centesimas = porcentajes.reduce((acc, texto) => acc + Math.round((Number(texto) || 0) * 100), 0)
  return centesimas / 100
}
