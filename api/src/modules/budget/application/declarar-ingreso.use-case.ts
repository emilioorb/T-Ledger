import { Inject, Injectable } from '@nestjs/common'
import { EditadoPorOtroError } from '../../../shared/http/api-error.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
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

  // `version` es la del ingreso que se vio; `null`, que se vio el mes sin ingreso. Así dos que
  // declaran a la vez un mes vacío no se pisan: el segundo recibe 409. Sin nada (la app sin
  // actualizar) se guarda como antes, y queda contado.
  execute(ingreso: MonthlyIncome, version?: number | null): Promise<MonthlyIncome> {
    return this.transaction.withTransaction(async () => {
      const anterior = await this.incomes.find(ingreso.period)
      if (anterior && version === null) throw new EditadoPorOtroError()
      if (anterior) exigirVersion(version ?? undefined, anterior.version ?? 0, 'declarar el ingreso del mes')
      const guardado = anterior
        ? await this.incomes.update({ ...ingreso, version: anterior.version ?? 0 })
        : await this.declararPorPrimeraVez(ingreso)
      await this.rastro.registrar({
        entidad: 'presupuesto',
        entidadId: `ingreso-${ingreso.period.toString()}`,
        accion: anterior ? 'editar' : 'crear',
        ...(anterior ? { antes: { ingreso: anterior.amount } } : {}),
        despues: { ingreso: ingreso.amount },
      })
      return guardado
    })
  }

  private async declararPorPrimeraVez(ingreso: MonthlyIncome): Promise<MonthlyIncome> {
    await this.incomes.add(ingreso)
    return { ...ingreso, version: 0 }
  }
}
