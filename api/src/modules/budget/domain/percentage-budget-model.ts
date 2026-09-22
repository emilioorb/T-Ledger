import { Decimal } from 'decimal.js'
import type { Money } from '../../../shared/kernel/money.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import type { BudgetBucket } from './budget-bucket.js'
import type { BucketStatus, BudgetEvaluation } from './budget-evaluation.js'
import type { BudgetModel } from './budget-model.js'
import type { CategorizedSpending } from './categorized-spending.js'

export interface BudgetModelProps {
  readonly id: string
  readonly name: string
  readonly buckets: readonly BudgetBucket[]
}

export class PercentageBudgetModel implements BudgetModel {
  private constructor(private readonly props: BudgetModelProps) {}

  static create(props: BudgetModelProps): Result<PercentageBudgetModel, RangeError> {
    if (props.buckets.length === 0) {
      return err(new RangeError('Un modelo de presupuesto necesita al menos una cubeta'))
    }

    const ids = new Set(props.buckets.map((bucket) => bucket.id))
    if (ids.size !== props.buckets.length) {
      return err(new RangeError('Las cubetas de un modelo no pueden repetir identificador'))
    }

    const total = props.buckets.reduce(
      (acc, bucket) => acc.plus(bucket.percentage.value),
      new Decimal(0),
    )
    if (!total.equals(100)) {
      return err(
        new RangeError(`Los porcentajes de un modelo deben sumar 100, suman ${total.toString()}`),
      )
    }

    if (props.buckets.filter((bucket) => bucket.isSavings).length !== 1) {
      return err(
        new RangeError(
          'Un modelo necesita exactamente una cubeta de ahorro, donde caen los abonos extraordinarios',
        ),
      )
    }

    return ok(new PercentageBudgetModel(props))
  }

  get id(): string {
    return this.props.id
  }
  get name(): string {
    return this.props.name
  }
  get buckets(): readonly BudgetBucket[] {
    return this.props.buckets
  }

  evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation {
    // allocate reparte el residuo: la suma de lo asignado siempre iguala el ingreso.
    const allocations = income.allocate(
      this.props.buckets.map((bucket) => bucket.percentage.value.toNumber()),
    )

    const buckets = this.props.buckets.map((bucket, index) => {
      const allocated = allocations[index] ?? income.multiply(0)
      const consumed = spending.amountFor(bucket.id)
      const deviation = unwrap(allocated.subtract(consumed))
      return {
        bucketId: bucket.id,
        name: bucket.name,
        allocated,
        consumed,
        deviation,
        status: statusOf(deviation, allocated),
      }
    })

    const totalConsumed = buckets.reduce(
      (acc, bucket) => unwrap(acc.add(bucket.consumed)),
      income.multiply(0),
    )

    return {
      income,
      buckets,
      totalConsumed,
      surplus: unwrap(income.subtract(totalConsumed)),
    }
  }
}

// Una desviación de hasta el 2 % de lo asignado se considera en línea: el presupuesto
// es una guía, no un cronómetro, y marcar en rojo una diferencia de un colón es ruido.
const ON_TRACK_TOLERANCE = 0.02

const statusOf = (deviation: Money, allocated: Money): BucketStatus => {
  const tolerance = allocated.multiply(ON_TRACK_TOLERANCE)
  const magnitude = deviation.isNegative() ? deviation.negate() : deviation
  if (unwrap(magnitude.compareTo(tolerance)) <= 0) return 'ON_TRACK'
  return deviation.isNegative() ? 'OVER' : 'UNDER'
}

// El modelo de fábrica no elige colores: los suyos son los que les tocan por su lugar, que es
// lo que hace que 50/30/20 se vea igual en todos los libros.
const bucket = (id: string, name: string, percentage: number, isSavings = false): BudgetBucket => ({
  id,
  name,
  percentage: unwrap(Percentage.create(percentage)),
  isSavings,
  colorIndex: null,
})

export const FIFTY_THIRTY_TWENTY: BudgetModelProps = {
  id: '50-30-20',
  name: '50/30/20',
  buckets: [
    bucket('necesidades', 'Necesidades', 50),
    bucket('deseos', 'Deseos', 30),
    bucket('ahorro', 'Ahorro', 20, true),
  ],
}

export const SEVENTY_TWENTY_TEN: BudgetModelProps = {
  id: '70-20-10',
  name: '70/20/10',
  buckets: [
    bucket('gastos', 'Gastos', 70),
    bucket('ahorro', 'Ahorro', 20, true),
    bucket('deuda', 'Deuda', 10),
  ],
}
