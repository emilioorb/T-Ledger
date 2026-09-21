import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { AccountClass } from './account-class.js'

export interface AccountProps {
  readonly code: string
  readonly name: string
  readonly accountClass: AccountClass
  readonly parentCode: string | null
  readonly active: boolean
  readonly sortOrder: number
}

export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(props: AccountProps): Result<Account, RangeError> {
    if (!/^\d{3,10}$/.test(props.code)) {
      return err(new RangeError(`El código de cuenta debe ser numérico, se recibió «${props.code}»`))
    }
    if (props.name.trim().length === 0) {
      return err(new RangeError('La cuenta necesita un nombre'))
    }
    if (props.parentCode !== null && props.parentCode === props.code) {
      return err(new RangeError('Una cuenta no puede ser su propia madre'))
    }
    return ok(new Account({ ...props, name: props.name.trim() }))
  }

  get code(): string { return this.props.code }
  get name(): string { return this.props.name }
  get accountClass(): AccountClass { return this.props.accountClass }
  get parentCode(): string | null { return this.props.parentCode }
  get active(): boolean { return this.props.active }
  get sortOrder(): number { return this.props.sortOrder }

  isChildOf(code: string): boolean {
    return this.props.parentCode === code
  }

  // Una cuenta suelta solo sabe si tiene madre. La profundidad real la calcula el árbol
  // con levelOf, que es el único que conoce la cadena completa hasta la raíz.
  level(): number {
    return this.props.parentCode === null ? 0 : 1
  }

  toProps(): AccountProps {
    return { ...this.props }
  }
}
