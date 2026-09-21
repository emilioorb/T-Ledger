import { z } from 'zod'
import { toUtcDate } from '../kernel/calendar.js'

// Un libro de finanzas personales no registra el siglo pasado ni el año 9999. El rango
// existe porque una fecha absurda crea un período contable fantasma que después rompe la
// cadena de cierres, y no hay forma de borrarlo por API.
const MIN_YEAR = 2000
const MAX_YEAR = 2100

const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? toUtcDate(Number(match[1]), Number(match[2]), Number(match[3])) : null
}

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })
  .refine((value) => parseIsoDate(value) !== null, {
    error: 'Esa fecha no existe en el calendario',
  })
  .refine(
    (value) => Number(value.slice(0, 4)) >= MIN_YEAR && Number(value.slice(0, 4)) <= MAX_YEAR,
    { error: `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}` },
  )

export const periodParam = z
  .string()
  .regex(/^\d{4}-\d{2}$/, { error: 'El período debe ser AAAA-MM' })
  .refine((value) => Number(value.slice(5, 7)) >= 1 && Number(value.slice(5, 7)) <= 12, {
    error: 'El mes debe estar entre 01 y 12',
  })
  .refine(
    (value) => Number(value.slice(0, 4)) >= MIN_YEAR && Number(value.slice(0, 4)) <= MAX_YEAR,
    { error: `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}` },
  )
