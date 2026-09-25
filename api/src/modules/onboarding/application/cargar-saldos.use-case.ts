import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { CreateJournalEntryUseCase } from '../../accounting/application/create-journal-entry.use-case.js'
import { CAJAS } from '../../accounting/infrastructure/cajas.js'
import { ONBOARDING_STEP_REPOSITORY, type OnboardingStepRepository } from '../domain/onboarding-step-repository.port.js'
import type { OpeningBalancesInput } from '../infrastructure/onboarding.schemas.js'
import type { BancoCreado } from './crear-bancos.use-case.js'
import { PasoIdempotente } from './paso-idempotente.js'

const APORTES = '3110'

type Lado = 'DEBIT' | 'CREDIT'
interface Linea {
  accountCode: string
  amount: { minorUnits: string; currency: CurrencyCode }
  side: Lado
}

export interface SaldosCargados {
  entries: { currency: CurrencyCode; journalEntryId: string }[]
}

const linea = (accountCode: string, monto: bigint, currency: CurrencyCode, positivo: Lado, negativo: Lado): Linea => ({
  accountCode,
  amount: { minorUnits: (monto < 0n ? -monto : monto).toString(), currency },
  side: monto < 0n ? negativo : positivo,
})

@Injectable()
export class CargarSaldosUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly asientos: CreateJournalEntryUseCase,
    @Inject(ONBOARDING_STEP_REPOSITORY) private readonly pasos: OnboardingStepRepository,
  ) {}

  execute({ date, balances }: OpeningBalancesInput): Promise<SaldosCargados> {
    return this.paso.correr('opening-balances', async () => {
      const monedas = await this.monedasPermitidas()
      const porMoneda = new Map<CurrencyCode, Linea[]>()
      const netos = new Map<CurrencyCode, bigint>()

      for (const { accountCode, amount } of balances) {
        const monto = BigInt(amount)
        if (monto === 0n) continue
        const currency = monedas.get(accountCode)
        if (!currency) throw new SemanticValidationError(`La cuenta ${accountCode} no es una caja ni un banco de la bienvenida.`)
        // Una caja no se sobregira: un negativo ahí es un error de tipeo, no un saldo.
        if (monto < 0n && accountCode in CAJAS) throw new SemanticValidationError('El efectivo no puede quedar en negativo.')

        porMoneda.set(currency, [...(porMoneda.get(currency) ?? []), linea(accountCode, monto, currency, 'DEBIT', 'CREDIT')])
        netos.set(currency, (netos.get(currency) ?? 0n) + monto)
      }

      const entries: SaldosCargados['entries'] = []
      for (const [currency, lineas] of porMoneda) {
        const neto = netos.get(currency) ?? 0n
        // Con neto cero Aportes no se mueve, y una línea en cero la rechaza el asiento.
        const contrapartida = neto === 0n ? [] : [linea(APORTES, neto, currency, 'CREDIT', 'DEBIT')]
        const asiento = await this.asientos.execute({
          date,
          description: 'Saldos iniciales',
          reference: null,
          lines: [...lineas, ...contrapartida],
        })
        entries.push({ currency, journalEntryId: asiento.id })
      }
      return { entries }
    })
  }

  // Las cajas de la semilla y los bancos que creó la bienvenida en este libro, con su moneda.
  private async monedasPermitidas(): Promise<Map<string, CurrencyCode>> {
    const bancos = ((await this.pasos.find('banks')) ?? []) as BancoCreado[]
    return new Map<string, CurrencyCode>([
      ...(Object.entries(CAJAS) as [string, CurrencyCode][]),
      ...bancos.map((banco): [string, CurrencyCode] => [banco.accountCode, banco.currency]),
    ])
  }
}
