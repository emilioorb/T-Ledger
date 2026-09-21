import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'

// Una meta, una inversión o una cuenta bancaria que apunta a un código inexistente se crea
// sin una queja y falla recién al registrar el primer asiento, con un mensaje que habla de
// otra cosa. Igual que el guardián de período, la regla vive en un solo lugar.
@Injectable()
export class AccountGuard {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async assertPostable(accountCode: string | null): Promise<void> {
    if (accountCode === null) return
    await this.assertAllPostable([accountCode])
  }

  async assertAllPostable(accountCodes: readonly string[]): Promise<void> {
    if (accountCodes.length === 0) return

    const chart = await this.accounts.loadChart()
    const invalid = accountCodes.find((code) => !chart.isPostable(code))
    if (invalid) {
      throw new SemanticValidationError(
        `La cuenta ${invalid} no acepta asientos: no existe, es agrupadora o está inactiva.`,
      )
    }
  }
}
