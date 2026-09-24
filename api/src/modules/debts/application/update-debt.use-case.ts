import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { BucketGuard } from '../../budget/application/bucket-guard.js'
import { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import type { UpdateDebtInput } from '../infrastructure/debt.schemas.js'

@Injectable()
export class UpdateDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    private readonly buckets: BucketGuard,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  // Todo adentro del candado del libro: armada con lo leído afuera, una edición pisaba un pago
  // que entraba en el medio (ADR-006).
  execute(id: string, input: UpdateDebtInput): Promise<Debt> {
    return this.transaction.withTransaction(() => this.editar(id, input))
  }

  private async editar(id: string, input: UpdateDebtInput): Promise<Debt> {
    const current = await this.debts.findById(id)
    if (!current) throw new NotFoundError(`No existe una deuda con el id ${id}`)
    exigirVersion(input.version, current.version, 'editar una deuda')

    if (input.budgetBucket !== undefined) await this.buckets.assertExists(input.budgetBucket)

    const props = current.toProps()
    const rate =
      input.annualRate === undefined && input.compounding === undefined
        ? props.rate
        : (() => {
            const created = InterestRate.create(
              new Decimal(input.annualRate ?? props.rate.annualPercentage.toString()),
              input.compounding ?? props.rate.compounding,
            )
            if (isErr(created)) throw new SemanticValidationError(created.error.message)
            return created.value
          })()

    const updated = Debt.create({
      ...props,
      name: input.name ?? props.name,
      counterparty: input.counterparty ?? props.counterparty,
      principal: input.principal ? toMoney(input.principal) : props.principal,
      rate,
      termMonths: input.termMonths ?? props.termMonths,
      startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : props.startDate,
      kind: input.kind ?? props.kind,
      direction: input.direction ?? props.direction,
      budgetBucket: input.budgetBucket === undefined ? props.budgetBucket : input.budgetBucket,
      notes: input.notes === undefined ? (props.notes ?? null) : input.notes,
    })
    if (isErr(updated)) throw new SemanticValidationError(updated.error.message)

    const guardada = await this.debts.update(updated.value)
    await this.rastro.registrar({
      entidad: 'deuda',
      entidadId: id,
      accion: 'editar',
      antes: props,
      despues: updated.value.toProps(),
    })
    return guardada
  }
}
