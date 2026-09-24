import { ConflictException, Inject, Injectable } from '@nestjs/common'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { fromMoney } from '../../../shared/http/money.schema.js'
import { isErr, type Result } from '../../../shared/kernel/result.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { CreateMovementUseCase } from '../../accounting/application/create-movement.use-case.js'
import { VoidMovementUseCase } from '../../accounting/application/void-movement.use-case.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

export interface PagoConMovimiento {
  date: string
  paymentAccountCode: string
  categoryId: string
}

export interface PagoSinMovimiento {
  date: string
}

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const oFallar = <T>(resultado: Result<T, RangeError>): T => {
  if (isErr(resultado)) throw new SemanticValidationError(resultado.error.message)
  return resultado.value
}

// Los pagos reales de las cuotas de una deuda propia. Sigue la forma del aporte a una meta: el
// gasto en la contabilidad, el pago en la deuda y el rastro, en una sola transacción. Si
// cualquiera falla —período cerrado, cuenta que no existe— no queda ninguno: una deuda que dice
// pagada sin gasto en el libro, o al revés, son dos versiones de la plata que no coinciden.
@Injectable()
export class PagosDeDeudaUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    private readonly crearMovimiento: CreateMovementUseCase,
    private readonly anularMovimiento: VoidMovementUseCase,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async pagar(id: string, pago: PagoConMovimiento): Promise<Debt> {
    const debt = await this.propia(id)
    const date = utc(pago.date)
    // Primero se valida la cuota con el dominio: no se crea un gasto para una cuota que no se
    // puede pagar.
    oFallar(debt.registerPayment({ date, movementId: null }))
    const cuota = debt.schedule().installmentNumber(debt.payments.length + 1)
    if (!cuota) throw new SemanticValidationError('La deuda ya no tiene cuotas por pagar')

    return this.transaction.withTransaction(async () => {
      const { movement } = await this.crearMovimiento.execute({
        date: pago.date,
        kind: 'EXPENSE',
        categoryId: pago.categoryId,
        counterparty: debt.counterparty,
        amount: fromMoney(cuota.payment),
        paymentAccountCode: pago.paymentAccountCode,
      })
      const pagada = oFallar(debt.registerPayment({ date, movementId: movement.id }))
      await this.guardar(pagada, 'pagar')
      return pagada
    })
  }

  // Para una cuota pagada fuera del libro: la salda sin tocar la contabilidad.
  async marcarPagada(id: string, pago: PagoSinMovimiento): Promise<Debt> {
    const debt = await this.propia(id)
    const pagada = oFallar(debt.registerPayment({ date: utc(pago.date), movementId: null }))
    await this.transaction.withTransaction(() => this.guardar(pagada, 'pagar'))
    return pagada
  }

  async deshacerUltimo(id: string): Promise<Debt> {
    const debt = await this.propia(id)
    const { debt: sinElUltimo, undone } = oFallar(debt.undoLastPayment())

    // Primero la deuda y después el gasto: al anularlo, contabilidad avisa y `alAnularSuGasto`
    // ya no encuentra el pago. Al revés lo desharía dos veces, con dos rastros.
    await this.transaction.withTransaction(async () => {
      await this.guardar(sinElUltimo, 'anular', debt)
      if (undone.movementId) await this.anularMovimiento.porRegla(undone.movementId)
    })
    return sinElUltimo
  }

  // Cuando alguien anula desde Movimientos el gasto de una cuota: la cuota vuelve a quedar sin
  // pagar, dentro de la misma transacción. Solo si es la última pagada: los pagos van en orden,
  // y deshacer una del medio dejaría una tabla que no corresponde a ninguna fila. En ese caso
  // se frena la anulación entera.
  async alAnularSuGasto(movementId: string): Promise<void> {
    const debt = await this.debts.findByPaymentMovement(movementId)
    if (!debt) return

    const { debt: sinElUltimo, undone } = oFallar(debt.undoLastPayment())
    if (undone.movementId !== movementId) {
      const cuota = debt.payments.find((pago) => pago.movementId === movementId)?.installmentNumber
      throw new ConflictException(
        `Ese gasto pagó la cuota ${cuota} de «${debt.name}», y después hay cuotas pagadas. Deshacé los pagos desde la deuda, del último para atrás.`,
      )
    }
    await this.guardar(sinElUltimo, 'anular', debt)
  }

  private async propia(id: string): Promise<Debt> {
    const debt = await this.debts.findById(id)
    if (!debt) throw new NotFoundError(`No existe una deuda con el id ${id}`)
    if (debt.isLent()) {
      throw new SemanticValidationError('Lo que te deben no lleva registro de pagos')
    }
    return debt
  }

  private async guardar(debt: Debt, accion: 'pagar' | 'anular', antes?: Debt): Promise<void> {
    await this.debts.save(debt)
    await this.rastro.registrar({
      entidad: 'deuda',
      entidadId: debt.id,
      accion,
      ...(antes ? { antes: { pagos: antes.payments } } : {}),
      despues: { pagos: debt.payments },
    })
  }
}

