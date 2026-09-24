import { Inject, Injectable } from '@nestjs/common'
import {
  ConflictError,
  NotFoundError,
  SemanticValidationError,
} from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { Account, type AccountProps } from '../domain/account.js'
import { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from '../infrastructure/accounting.schemas.js'

@Injectable()
export class SaveAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  // `save` del repositorio es un upsert: sin esta guarda, crear un código que ya existe
  // renombraba la cuenta vieja y respondía 201, como si fuera una cuenta nueva.
  // Todo en transacción: el plan entero y los asientos de la madre se leen con el candado del
  // libro tomado, así nadie los cambia entre la validación y el guardado (ADR-006).
  async create(input: CreateAccountInput): Promise<Account> {
    return this.transaction.withTransaction(() => this.crear(input))
  }

  async update(code: string, input: UpdateAccountInput): Promise<Account> {
    return this.transaction.withTransaction(() => this.actualizar(code, input))
  }

  private async crear(input: CreateAccountInput): Promise<Account> {
    if (await this.accounts.findByCode(input.code)) {
      throw new ConflictError(`La cuenta ${input.code} ya existe en el plan.`)
    }
    return this.save(input)
  }

  private async actualizar(code: string, { version, ...input }: UpdateAccountInput): Promise<Account> {
    const current = await this.accounts.findByCode(code)
    if (!current) throw new NotFoundError(`La cuenta ${code} no existe en el plan.`)
    exigirVersion(version, current.version, 'editar una cuenta')

    const props = current.toProps()
    const guardada = await this.save({
      ...props,
      name: input.name ?? props.name,
      accountClass: input.accountClass ?? props.accountClass,
      parentCode: input.parentCode === undefined ? props.parentCode : input.parentCode,
      active: input.active ?? props.active,
      sortOrder: input.sortOrder ?? props.sortOrder,
    })
    return guardada.guardada()
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

    // Colgar una hija de una cuenta que ya tiene asientos la vuelve agrupadora y le deja el
    // saldo adentro: el árbol lo cuenta dos veces y nadie se entera hasta cuadrar a mano.
    if (props.parentCode !== null && (await this.journal.hasEntriesFor(props.parentCode))) {
      throw new SemanticValidationError(
        `La cuenta ${props.parentCode} ya tiene asientos: no puede tener cuentas hijas.`,
      )
    }

    await this.accounts.save(account.value)
    return account.value
  }
}
