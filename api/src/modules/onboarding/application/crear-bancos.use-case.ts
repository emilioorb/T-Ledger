import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { SaveAccountUseCase } from '../../accounting/application/save-account.use-case.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../../accounting/domain/account-repository.port.js'
import { siguienteCodigoLibre } from '../../accounting/domain/codigo-libre.js'
import { ManageBankAccountsUseCase } from '../../banking/application/manage-bank-accounts.use-case.js'
import type { BanksInput } from '../infrastructure/onboarding.schemas.js'
import { PasoIdempotente } from './paso-idempotente.js'

export interface BancoCreado {
  name: string
  currency: CurrencyCode
  accountCode: string
  bankAccountId: string
}

const EFECTIVO_Y_EQUIVALENTES = '1100'
const PRIMER_BANCO = 1121
const ULTIMO_BANCO = 1189
const EN = { CRC: 'colones', USD: 'dólares' } as const satisfies Record<CurrencyCode, string>

@Injectable()
export class CrearBancosUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly cuentas: SaveAccountUseCase,
    private readonly bancos: ManageBankAccountsUseCase,
    @Inject(ACCOUNT_REPOSITORY) private readonly plan: AccountRepository,
  ) {}

  execute({ banks }: BanksInput): Promise<BancoCreado[]> {
    return this.paso.correr('banks', async () => {
      const ocupados = new Set((await this.plan.loadChart()).all().map((cuenta) => cuenta.code))
      const creados: BancoCreado[] = []
      for (const { name, currency } of banks) {
        const codigo = siguienteCodigoLibre(ocupados, PRIMER_BANCO, ULTIMO_BANCO)
        if (isErr(codigo)) throw new SemanticValidationError(codigo.error.message)
        ocupados.add(codigo.value)

        const nombre = `${name} ${EN[currency]}`
        await this.cuentas.create({
          code: codigo.value,
          name: nombre,
          accountClass: 'ASSET',
          parentCode: EFECTIVO_Y_EQUIVALENTES,
          active: true,
          sortOrder: 50 + creados.length,
        })
        const banco = await this.bancos.create({ name: nombre, accountCode: codigo.value, currency, profileId: null, active: true })
        creados.push({ name: nombre, currency, accountCode: codigo.value, bankAccountId: banco.id })
      }
      return creados
    })
  }
}
