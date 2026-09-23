import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Decimal } from 'decimal.js'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { isErr } from '../../../shared/kernel/result.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { BucketGuard } from '../../budget/application/bucket-guard.js'
import { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import type { CreateDebtInput } from '../infrastructure/debt.schemas.js'

@Injectable()
export class CreateDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    private readonly buckets: BucketGuard,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async execute(input: CreateDebtInput): Promise<Debt> {
    await this.buckets.assertExists(input.budgetBucket)

    const rate = InterestRate.create(new Decimal(input.annualRate), input.compounding)
    if (isErr(rate)) throw new SemanticValidationError(rate.error.message)

    const debt = Debt.create({
      id: randomUUID(),
      name: input.name,
      counterparty: input.counterparty,
      principal: toMoney(input.principal),
      rate: rate.value,
      termMonths: input.termMonths,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      kind: input.kind,
      direction: input.direction,
      budgetBucket: input.budgetBucket,
      notes: input.notes,
    })
    if (isErr(debt)) throw new SemanticValidationError(debt.error.message)

    // Quien carga un préstamo que ya viene pagando no tiene cómo registrar las cuotas de antes:
    // esas quedan saldadas, y desde acá se registra cada pago de verdad.
    const cargada = debt.value.isBorrowed() ? debt.value.settleDueBefore(new Date()) : debt.value

    // La deuda y su rastro, juntos: guardar una sin el otro deja una deuda que apareció sola.
    await this.transaction.withTransaction(async () => {
      await this.debts.save(cargada)
      await this.rastro.registrar({
        entidad: 'deuda',
        entidadId: cargada.id,
        accion: 'crear',
        despues: cargada.toProps(),
      })
    })

    return cargada
  }
}
