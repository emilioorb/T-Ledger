import { err, ok, type Result } from '../../../shared/kernel/result.js'

export type CategoryKind = 'EXPENSE' | 'INCOME'

export interface CategoryProps {
  readonly id: string
  readonly name: string
  readonly kind: CategoryKind
  // Sin cuenta, los movimientos de esta categoría se registran pero no se contabilizan.
  readonly accountCode: string | null
  readonly sortOrder: number
  readonly active: boolean
}

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(props: CategoryProps): Result<Category, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('La categoría necesita un nombre'))
    }
    return ok(new Category({ ...props, name: props.name.trim() }))
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get kind(): CategoryKind { return this.props.kind }
  get accountCode(): string | null { return this.props.accountCode }
  get sortOrder(): number { return this.props.sortOrder }
  get active(): boolean { return this.props.active }

  isPostable(): boolean {
    return this.props.accountCode !== null && this.props.active
  }

  toProps(): CategoryProps {
    return { ...this.props }
  }
}
