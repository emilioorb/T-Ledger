// Bancos y Categorías marcan sus opciones con el mismo patrón: un Set y un valor que entra o
// sale de él. Puro, para poder probarlo sin montar ningún paso.
export const alternar = <T>(actuales: ReadonlySet<T>, valor: T): Set<T> => {
  const siguientes = new Set(actuales)
  if (siguientes.has(valor)) siguientes.delete(valor)
  else siguientes.add(valor)
  return siguientes
}
