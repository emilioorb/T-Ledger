import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { Account, type AccountProps } from '../domain/account.js'
import { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from '../infrastructure/accounting.schemas.js'

@Injectable()
export class SaveAccountUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async create(input: CreateAccountInput): Promise<Account> {
    return this.save(input)
  }

  async update(code: string, input: UpdateAccountInput): Promise<Account> {
    const current = await this.accounts.findByCode(code)
    if (!current) throw new NotFoundError(`La cuenta ${code} no existe en el plan.`)

    const props = current.toProps()
    return this.save({
      ...props,
      name: input.name ?? props.name,
      accountClass: input.accountClass ?? props.accountClass,
      parentCode: input.parentCode === undefined ? props.parentCode : input.parentCode,
      active: input.active ?? props.active,
      sortOrder: input.sortOrder ?? props.sortOrder,
    })
  }

  // La cuenta se valida contra el plan entero, no sola: colgar de una madre inexistente
  // o de otra clase solo se ve desde el árbol completo.
  private async save(props: AccountProps): Promise<Account> {
    const account = Account.create(props)
    if (isErr(account)) throw new SemanticValidationError(account.error.message)

    const chart = await this.accounts.loadChart()
    const others = chart.all().filter((existing) => existing.code !== props.code)
    const validated = ChartOfAccounts.create([...others, account.value])
    if (isErr(validated)) throw new SemanticValidationError(validated.error.message)

    await this.accounts.save(account.value)
    return account.value
  }
}
