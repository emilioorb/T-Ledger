import { z } from 'zod'

// Sin tope, un nombre de varios megas entra con 201 y después viaja en cada listado. Los
// números son generosos a propósito: el límite está para que exista, no para estorbar.
const NAME_MAX = 120
const TEXT_MAX = 500

export const nameText = z.string().trim().min(1).max(NAME_MAX)
export const longText = z.string().trim().min(1).max(TEXT_MAX)

// Una tasa de cuatro cifras no es un error de dedo: es lo que hace que la amortización
// devuelva números sin sentido sin fallar nunca.
const RATE_MAX = 200

export const annualRate = z
  .string()
  .regex(/^\d+(\.\d+)?$/, { error: 'La tasa debe ser un decimal no negativo' })
  .refine((value) => Number(value) <= RATE_MAX, { error: `La tasa no puede superar ${RATE_MAX} %` })

// Cincuenta años. Una deuda a 100.000 meses generaba una tabla de 23 MB en quince segundos.
export const termMonths = z.number().int().positive().max(600)
