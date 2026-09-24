export interface Cambio {
  campo: string
  antes: unknown
  despues: unknown
}

// Lo que no dice nada al leer el rastro. El identificador y el libro no cambian nunca —si
// cambiaran sería otro registro—, y las marcas de tiempo cambian en cada guardado sin que
// nadie las haya tocado: listarlas convierte cada entrada en ruido. La versión también: la sube
// la base en cada escritura, y es para detectar choques, no algo que alguien cambió.
const SIN_INTERES = new Set(['id', 'bookId', 'createdAt', 'updatedAt', 'version'])

// Deja el valor en algo que sobreviva a `JSON`. Los montos del dominio son `BigInt` —céntimos,
// para no perder plata en coma flotante— y `JSON.stringify` los rechaza de plano: sin esto, el
// rastro de un movimiento revienta justo en el campo que más importa.
const normalizar = (valor: unknown): unknown => {
  if (typeof valor === 'bigint') return valor.toString()
  if (valor instanceof Date) return valor.toISOString()
  // `toJSON` es la convención con la que un objeto dice cómo quiere verse serializado, y los
  // decimales del dominio —tasas de interés, porcentajes de presupuesto— la implementan.
  // Sin esto, una tasa quedaba guardada como `{ s: 1, e: 1, d: [12, 5] }`: los internos de
  // decimal.js en vez del número, ilegible para quien lea el rastro y para cualquiera que
  // quiera compararlo.
  if (valor && typeof valor === 'object' && 'toJSON' in valor) {
    const conJson = valor as { toJSON: () => unknown }
    if (typeof conJson.toJSON === 'function') return normalizar(conJson.toJSON())
  }
  if (Array.isArray(valor)) return valor.map(normalizar)
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([clave, v]) => [clave, normalizar(v)]),
    )
  }
  return valor
}

// Comparar por el valor normalizado y no por identidad: dos `Date` con la misma fecha son
// objetos distintos, y dos montos iguales que vienen de consultas distintas también.
const mismoValor = (a: unknown, b: unknown): boolean =>
  JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b))

// Qué cambió, campo por campo. Vive acá y no en cada caso de uso porque si cada uno arma su
// propio diff, el rastro termina contando la misma historia de siete maneras.
//
// Recorre la unión de las dos versiones: un campo que aparece o desaparece también es un
// cambio, y mirar solo las claves de «antes» los dejaría afuera.
export const calcularCambios = (antes: object, despues: object): Cambio[] => {
  // El cast vive acá adentro y no en los llamadores: las props del dominio son interfaces, que
  // TypeScript no acepta como registros indexados. Entre castear una vez en la función que
  // recorre claves o pedírselo a los dieciocho casos de uso, gana la primera.
  const anterior = antes as Record<string, unknown>
  const nuevo = despues as Record<string, unknown>
  const campos = new Set([...Object.keys(anterior), ...Object.keys(nuevo)])

  return [...campos]
    .filter((campo) => !SIN_INTERES.has(campo))
    .filter((campo) => !mismoValor(anterior[campo], nuevo[campo]))
    .map((campo) => ({
      campo,
      antes: normalizar(anterior[campo]),
      despues: normalizar(nuevo[campo]),
    }))
}
