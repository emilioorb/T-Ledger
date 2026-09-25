export const PASOS = ['intro', 'monedas', 'bancos', 'saldos', 'categorias', 'ingreso', 'cierre'] as const
export type Paso = (typeof PASOS)[number]
