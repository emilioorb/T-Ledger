import { Decimal } from 'decimal.js'
import { z } from 'zod'
import { unwrap } from '../../../../shared/kernel/result.js'
import { ExchangeRate, type RateIndicator } from '../../domain/exchange-rate.js'

export class BccrEmptyResponseError extends Error {
  readonly code = 'BCCR_EMPTY_RESPONSE'
  constructor(message: string) {
    super(message)
    this.name = 'BccrEmptyResponseError'
  }
}

const seriesPointSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha del BCCR debe ser AAAA-MM-DD' }),
  valorDatoPorPeriodo: z.number().positive({ error: 'Una tasa debe ser mayor que cero' }),
})

const responseSchema = z.object({
  estado: z.boolean(),
  mensaje: z.string(),
  datos: z.array(
    z.object({
      codigoIndicador: z.string(),
      nombreIndicador: z.string(),
      series: z.array(seriesPointSchema),
    }),
  ),
})

// La validación no es ceremonia: el servicio devuelve 200 con `datos: []` cuando no hay
// datos para el rango, así que sin esto un hueco de sincronización pasaría por éxito.
export const parseBccrResponse = (payload: unknown, indicator: RateIndicator): ExchangeRate[] => {
  const result = responseSchema.safeParse(payload)
  if (!result.success) {
    throw new Error(`El BCCR devolvió una respuesta con forma inesperada:\n${z.prettifyError(result.error)}`)
  }

  const series = result.data.datos.flatMap((dato) => dato.series)
  if (series.length === 0) {
    throw new BccrEmptyResponseError(result.data.mensaje)
  }

  return series.map((punto) =>
    unwrap(
      ExchangeRate.create({
        indicator,
        // El valor llega como número JSON; se pasa por string para que Decimal no herede
        // el redondeo del doble.
        value: new Decimal(String(punto.valorDatoPorPeriodo)),
        publishedAt: new Date(`${punto.fecha}T00:00:00.000Z`),
      }),
    ),
  )
}
