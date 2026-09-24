import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Decimal } from 'decimal.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { AccountGuard } from '../../accounting/application/account-guard.js'
import { CreateJournalEntryUseCase } from '../../accounting/application/create-journal-entry.use-case.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { INVESTMENT_MATURED, type InvestmentMatured } from '../domain/investment-events.js'
import { Investment } from '../domain/investment.js'
import {
  INVESTMENT_REPOSITORY,
  type InvestmentRepository,
} from '../domain/investment-repository.port.js'
import type {
  CreateInvestmentInput,
  InvestmentContributionInput,
  UpdateInvestmentInput,
} from '../infrastructure/investments.schemas.js'

const utc = (date: string): Date => new Date(`${date}T00:00:00.000Z`)

@Injectable()
export class ManageInvestmentsUseCase {
  constructor(
    @Inject(INVESTMENT_REPOSITORY) private readonly investments: InvestmentRepository,
    private readonly journal: CreateJournalEntryUseCase,
    private readonly accounts: AccountGuard,
    private readonly events: EventEmitter2,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async list(): Promise<Investment[]> {
    return this.investments.findAll()
  }

  async find(id: string): Promise<Investment> {
    const investment = await this.investments.findById(id)
    if (!investment) throw new NotFoundError(`La inversión ${id} no existe.`)
    return investment
  }

  // Todo adentro del candado del libro: la cuenta, la inversión y su capital se leen ahí (ADR-006).
  create(input: CreateInvestmentInput): Promise<Investment> {
    return this.transaction.withTransaction(async () => {
      await this.accounts.assertPostable(input.accountCode)
      const rate = InterestRate.create(new Decimal(input.annualRate), input.compounding)
      if (isErr(rate)) throw new SemanticValidationError(rate.error.message)

      const investment = Investment.create({
        id: randomUUID(),
        name: input.name,
        principal: toMoney(input.principal),
        rate: rate.value,
        openedAt: utc(input.openedAt),
        kind: input.kind,
        maturesAt: input.maturesAt ? utc(input.maturesAt) : null,
        accountCode: input.accountCode,
        contributions: [],
      })
      if (isErr(investment)) throw new SemanticValidationError(investment.error.message)

      await this.investments.add(investment.value)
      await this.rastro.registrar({
        entidad: 'inversion',
        entidadId: investment.value.id,
        accion: 'crear',
        despues: investment.value.toProps(),
      })
      return investment.value
    })
  }

  update(id: string, { version, ...input }: UpdateInvestmentInput): Promise<Investment> {
    return this.transaction.withTransaction(async () => {
      const actual = await this.find(id)
      exigirVersion(version, actual.version, 'editar una inversión')
      const props = actual.toProps()
      if (input.accountCode !== undefined) await this.accounts.assertPostable(input.accountCode)

      const rate = InterestRate.create(
        new Decimal(input.annualRate ?? props.rate.annualPercentage),
        input.compounding ?? props.rate.compounding,
      )
      if (isErr(rate)) throw new SemanticValidationError(rate.error.message)

      const investment = Investment.create({
        ...props,
        name: input.name ?? props.name,
        principal: input.principal ? toMoney(input.principal) : props.principal,
        rate: rate.value,
        openedAt: input.openedAt ? utc(input.openedAt) : props.openedAt,
        kind: input.kind ?? props.kind,
        maturesAt: maturityOf(input.maturesAt, props.maturesAt),
        accountCode: input.accountCode === undefined ? props.accountCode : input.accountCode,
      })
      if (isErr(investment)) throw new SemanticValidationError(investment.error.message)

      const guardada = await this.investments.update(investment.value)
      await this.rastro.registrar({
        entidad: 'inversion',
        entidadId: id,
        accion: 'editar',
        antes: props,
        despues: investment.value.toProps(),
      })
      return guardada
    })
  }

  // Dos aportes de capital a la vez son dos aportes: no se pide versión.
  contribute(id: string, input: InvestmentContributionInput): Promise<Investment> {
    return this.transaction.withTransaction(async () => {
      const investment = await this.find(id)

      // Sin cuenta no hay dónde asentar el capital, y una inversión que crece sin que el libro
      // lo vea deja el patrimonio contando esa plata dos veces: en la cuenta de origen y acá.
      if (investment.accountCode === null) {
        throw new SemanticValidationError(
          `La inversión «${investment.name}» no tiene cuenta. Elegí una antes de agregar capital.`,
        )
      }

      const contribution = {
        id: randomUUID(),
        date: utc(input.date),
        amount: toMoney(input.amount),
      }

      const updated = investment.addContribution(contribution)
      if (isErr(updated)) throw new SemanticValidationError(updated.error.message)

      // El asiento primero: si el período está cerrado, el capital no se agrega. Y los dos en
      // la misma transacción: si la segunda escritura falla queda un asiento huérfano.
      await this.journal.execute({
        date: input.date,
        description: `Capital a ${investment.name}`,
        reference: null,
        lines: [
          { accountCode: investment.accountCode, amount: input.amount, side: 'DEBIT' },
          { accountCode: input.fromAccountCode, amount: input.amount, side: 'CREDIT' },
        ],
      })

      await this.investments.addContribution(id, contribution)
      // El aporte y no la inversión entera: lo que pasó es que entró este capital.
      await this.rastro.registrar({
        entidad: 'inversion',
        entidadId: id,
        accion: 'aportar',
        despues: contribution,
      })
      return updated.value.guardada()
    })
  }

  delete(id: string, version?: number): Promise<void> {
    // Se lee antes de borrar, y adentro: después ya no hay a quién preguntarle qué inversión era.
    return this.transaction.withTransaction(async () => {
      const inversion = await this.find(id)
      exigirVersion(version, inversion.version, 'borrar una inversión')
      await this.investments.delete(id)
      await this.rastro.registrar({
        entidad: 'inversion',
        entidadId: id,
        accion: 'eliminar',
        antes: inversion.toProps(),
      })
    })
  }

  // Las inversiones que ya vencieron a una fecha. Se emite un evento por cada una: el
  // capital vuelve a estar disponible y el flujo del mes cambia.
  async announceMatured(at = new Date()): Promise<InvestmentMatured[]> {
    const matured: InvestmentMatured[] = []

    for (const investment of await this.investments.findAll()) {
      const maturesAt = investment.maturesAt
      if (!maturesAt || !investment.isMaturedAt(at)) continue
      matured.push({
        investmentId: investment.id,
        name: investment.name,
        maturedAt: maturesAt,
      })
    }

    for (const event of matured) this.events.emit(INVESTMENT_MATURED, event)
    return matured
  }
}

// `undefined` deja el vencimiento como estaba; `null` lo quita, que es lo que hace falta
// al pasar una inversión a plazo a abierta.
const maturityOf = (input: string | null | undefined, current: Date | null): Date | null => {
  if (input === undefined) return current
  return input === null ? null : utc(input)
}
