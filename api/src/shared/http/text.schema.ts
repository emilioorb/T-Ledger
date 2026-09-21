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

// El comprobante se guarda como texto y hoy no se renderiza como enlace, pero el campo se
// llama «Comprobante»: el día que se muestre, un `javascript:` guardado es XSS almacenado y
// el arreglo habría llegado tarde. Se permite lo que de verdad sirve para llegar a un
// comprobante y nada más.
const SAFE_PROTOCOLS = ['http:', 'https:']

const isSafeUrl = (value: string): boolean => {
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol)
  } catch {
    // Una ruta relativa no lleva protocolo y no puede ejecutar nada.
    return value.startsWith('/') && !value.startsWith('//')
  }
}

export const receiptUrl = longText.refine(isSafeUrl, {
  error: 'El comprobante tiene que ser una dirección http o https',
})
