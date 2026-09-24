import { Inject, Injectable } from '@nestjs/common'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import {
  BUDGET_INCOME_REPOSITORY,
  type BudgetIncomeRepository,
} from '../domain/budget-income-repository.port.js'
import type { MonthlyIncome } from '../domain/budget-income.js'

// Declarar el ingreso de un mes. Antes lo escribía el controller directo en el repositorio, sin
// transacción ni rastro: sin el candado del libro no se escribe (ADR-006), y el ingreso es una
// decisión sobre la plata del mes, así que queda anotado quién lo cambió (ADR-004).
@Injectable()
export class DeclararIngresoUseCase {
  constructor(
    @Inject(BUDGET_INCOME_REPOSITORY) private readonly incomes: BudgetIncomeRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async execute(ingreso: MonthlyIncome): Promise<void> {
    await this.transaction.withTransaction(async () => {
      const anterior = await this.incomes.find(ingreso.period)
      await this.incomes.save(ingreso)
      await this.rastro.registrar({
        entidad: 'presupuesto',
        entidadId: `ingreso-${ingreso.period.toString()}`,
        accion: anterior ? 'editar' : 'crear',
        ...(anterior ? { antes: { ingreso: anterior.amount } } : {}),
        despues: { ingreso: ingreso.amount },
      })
    })
  }
}
