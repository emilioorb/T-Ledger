import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import type { Account } from '../domain/account.js'

@Injectable()
export class GetAccountUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(code: string): Promise<Account> {
    const account = await this.accounts.findByCode(code)
    if (!account) throw new NotFoundError(`La cuenta ${code} no existe en el plan.`)
    return account
  }
}
