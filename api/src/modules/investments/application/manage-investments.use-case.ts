import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Decimal } from 'decimal.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
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
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<Investment[]> {
    return this.investments.findAll()
  }

  async find(id: string): Promise<Investment> {
    const investment = await this.investments.findById(id)
    if (!investment) throw new NotFoundError(`La inversión ${id} no existe.`)
    return investment
  }

  async create(input: CreateInvestmentInput): Promise<Investment> {
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

    await this.investments.save(investment.value)
    return investment.value
  }

  async update(id: string, input: UpdateInvestmentInput): Promise<Investment> {
    const props = (await this.find(id)).toProps()

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

    await this.investments.save(investment.value)
    return investment.value
  }

  async contribute(id: string, input: InvestmentContributionInput): Promise<Investment> {
    const investment = await this.find(id)
    const contribution = {
      id: randomUUID(),
      date: utc(input.date),
      amount: toMoney(input.amount),
    }

    const updated = investment.addContribution(contribution)
    if (isErr(updated)) throw new SemanticValidationError(updated.error.message)

    await this.investments.addContribution(id, contribution)
    return updated.value
  }

  async delete(id: string): Promise<void> {
    if (!(await this.investments.delete(id))) {
      throw new NotFoundError(`La inversión ${id} no existe.`)
    }
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
