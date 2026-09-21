import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SyncExchangeRatesUseCase } from '../application/sync-exchange-rates.use-case.js'

@Injectable()
export class ExchangeRatesSyncJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExchangeRatesSyncJob.name)

  constructor(private readonly sync: SyncExchangeRatesUseCase) {}

  // Al arrancar se detecta el hueco entre la última tasa almacenada y hoy.
  async onApplicationBootstrap(): Promise<void> {
    await this.run('arranque')
  }

  // La zona es America/Costa_Rica porque el horario de publicación del BCCR es local.
  // waitForCompletion evita que dos corridas se pisen si una se demora.
  @Cron('0 30 7 * * *', {
    name: 'sync-exchange-rates',
    timeZone: 'America/Costa_Rica',
    waitForCompletion: true,
  })
  async daily(): Promise<void> {
    await this.run('diario')
  }

  private async run(origin: string): Promise<void> {
    const report = await this.sync.execute()
    if (report.failed) {
      this.logger.warn(`Sincronización ${origin} fallida: ${report.reason}`)
      return
    }
    this.logger.log(`Sincronización ${origin}: ${report.saved} tasas guardadas`)
  }
}
