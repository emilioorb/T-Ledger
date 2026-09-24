import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../accounting/domain/account-repository.port.js'
import { BankAccount, type BankAccountProps } from '../domain/bank-account.js'
import {
  BANK_ACCOUNT_REPOSITORY,
  type BankAccountRepository,
} from '../domain/bank-account-repository.port.js'
import type { BankAccountInput } from '../infrastructure/banking.schemas.js'

@Injectable()
export class ManageBankAccountsUseCase {
  constructor(
    @Inject(BANK_ACCOUNT_REPOSITORY) private readonly accounts: BankAccountRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly chart: AccountRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  async list(): Promise<BankAccount[]> {
    return this.accounts.findAll()
  }

  async find(id: string): Promise<BankAccount> {
    const account = await this.accounts.findById(id)
    if (!account) throw new NotFoundError(`La cuenta bancaria ${id} no existe.`)
    return account
  }

  // En transacción, con el candado del libro: el plan de cuentas se lee adentro (ADR-006).
  async create(input: BankAccountInput): Promise<BankAccount> {
    return this.transaction.withTransaction(() => this.save({ id: randomUUID(), ...input }))
  }

  async update(id: string, input: BankAccountInput): Promise<BankAccount> {
    return this.transaction.withTransaction(async () => {
      await this.find(id)
      return this.save({ id, ...input })
    })
  }

  // Una cuenta bancaria apuntando a una agrupadora produciría movimientos que no se pueden
  // asentar, y el error aparecería recién al conciliar.
  private async save(props: BankAccountProps): Promise<BankAccount> {
    const account = BankAccount.create(props)
    if (isErr(account)) throw new SemanticValidationError(account.error.message)

    const chart = await this.chart.loadChart()
    if (!chart.isPostable(props.accountCode)) {
      throw new SemanticValidationError(
        `La cuenta ${props.accountCode} no acepta asientos: es agrupadora o está inactiva.`,
      )
    }

    await this.accounts.save(account.value)
    return account.value
  }
}
