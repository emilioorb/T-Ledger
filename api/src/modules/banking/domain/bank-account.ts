import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'

export interface BankAccountProps {
  readonly id: string
  readonly name: string
  // La cuenta del plan contra la que se concilia. Tiene que aceptar asientos.
  readonly accountCode: string
  readonly currency: CurrencyCode
  readonly profileId: string | null
  readonly active: boolean
  // La versión de la fila sobre la que se armó este estado. Opcional al crear: nace en 0.
  readonly version?: number
}

export class BankAccount {
  private constructor(private readonly props: BankAccountProps) {}

  static create(props: BankAccountProps): Result<BankAccount, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('La cuenta bancaria necesita un nombre'))
    }
    if (!/^\d{3,10}$/.test(props.accountCode)) {
      return err(new RangeError('El código de cuenta debe ser numérico'))
    }
    return ok(new BankAccount({ ...props, name: props.name.trim() }))
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get accountCode(): string { return this.props.accountCode }
  get currency(): CurrencyCode { return this.props.currency }
  get profileId(): string | null { return this.props.profileId }
  get active(): boolean { return this.props.active }
  get version(): number { return this.props.version ?? 0 }

  // Lo que queda después de guardarse: la base sube la versión en cada escritura.
  guardada(): BankAccount {
    return new BankAccount({ ...this.props, version: this.version + 1 })
  }

  toProps(): BankAccountProps {
    return { ...this.props }
  }
}
