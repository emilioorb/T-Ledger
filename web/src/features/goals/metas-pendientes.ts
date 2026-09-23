// Las metas que piden plata hoy: las que no llegaron y no están en pausa. Una pausada guarda su
// avance, pero el tablero no la cuenta entre lo pendiente mientras esté quieta.
export const metasPendientes = <T extends { reached: boolean; active: boolean }>(metas: readonly T[]): T[] =>
  metas.filter((meta) => meta.active && !meta.reached)
