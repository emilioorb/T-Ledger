import type { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { CategoryKind } from './category.js'

export type MovementStatus = 'ACTIVE' | 'VOIDED'

export interface MovementProps {
  readonly id: string
  readonly date: Date
  readonly kind: CategoryKind
  readonly categoryId: string
  readonly counterparty: string
  readonly amount: Money
  readonly paymentAccountCode: string | null
  readonly receiptKey: string | null
  readonly status: MovementStatus
}

export class Movement {
  private constructor(private readonly props: MovementProps) {}

  static create(props: MovementProps): Result<Movement, RangeError> {
    if (props.amount.isZero() || props.amount.isNegative()) {
      return err(new RangeError('El monto de un movimiento debe ser mayor que cero'))
    }
    if (props.counterparty.trim().length === 0) {
      return err(new RangeError('El movimiento necesita un proveedor o una fuente'))
    }
    if (Number.isNaN(props.date.getTime())) {
      return err(new RangeError('El movimiento recibió una fecha inválida'))
    }
    return ok(new Movement({ ...props, counterparty: props.counterparty.trim() }))
  }

  get id(): string {
    return this.props.id
  }
  get date(): Date {
    return this.props.date
  }
  get kind(): CategoryKind {
    return this.props.kind
  }
  get categoryId(): string {
    return this.props.categoryId
  }
  get counterparty(): string {
    return this.props.counterparty
  }
  get amount(): Money {
    return this.props.amount
  }
  get paymentAccountCode(): string | null {
    return this.props.paymentAccountCode
  }
  get receiptKey(): string | null {
    return this.props.receiptKey
  }
  get status(): MovementStatus {
    return this.props.status
  }

  isVoided(): boolean {
    return this.props.status === 'VOIDED'
  }

  // Un movimiento no se borra. Anularlo produce uno nuevo marcado, y su asiento
  // de reversión queda junto al original en el mayor.
  void_(): Movement {
    return new Movement({ ...this.props, status: 'VOIDED' })
  }

  toProps(): MovementProps {
    return { ...this.props }
  }
}
