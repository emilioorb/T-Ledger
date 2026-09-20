import type { DateRange } from '../../../../shared/kernel/date-range.js'
import type { RateIndicator } from '../../domain/exchange-rate.js'
import type { BccrConfig } from './bccr.config.js'

export class BccrAuthError extends Error {
  readonly code = 'BCCR_AUTH'
  constructor(status: number) {
    super(`El BCCR rechazó la credencial con ${status}. Revisar BCCR_TOKEN.`)
    this.name = 'BccrAuthError'
  }
}

export class BccrUnavailableError extends Error {
  readonly code = 'BCCR_UNAVAILABLE'
  constructor(status: number) {
    super(`El BCCR respondió ${status}`)
    this.name = 'BccrUnavailableError'
  }
}

const PATH = '/SDDE/api/Bccr.GE.SDDE.Publico.Indicadores.API/indicadoresEconomicos'

// El BCCR espera aaaa/mm/dd, no ISO. Una fecha en otro formato no da error: da vacío.
const toBccrDate = (date: Date): string =>
  `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`

export class BccrApiClient {
  constructor(private readonly config: BccrConfig) {}

  async fetchSeries(indicator: RateIndicator, range: DateRange): Promise<unknown> {
    const url = new URL(`${PATH}/${indicator}/series`, this.config.baseUrl)
    url.searchParams.set('fechaInicio', toBccrDate(range.from))
    url.searchParams.set('fechaFin', toBccrDate(range.to))
    url.searchParams.set('idioma', 'es')

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${this.config.token}`, accept: 'application/json' },
    })

    // 401 y 403 son de credencial y no se arreglan reintentando; el resto sí.
    if (response.status === 401 || response.status === 403) throw new BccrAuthError(response.status)
    if (!response.ok) throw new BccrUnavailableError(response.status)

    return response.json()
  }
}
