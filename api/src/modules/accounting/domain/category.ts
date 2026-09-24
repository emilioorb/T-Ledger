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
  // Cuál de los diez colores del sistema, por número. `null` es «el que le toque»: el color
  // se elige, no se exige.
  readonly colorIndex: number | null
  // La versión de la fila sobre la que se armó (6b). Opcional al crear: nace en 0.
  readonly version?: number
}

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(props: CategoryProps): Result<Category, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('La categoría necesita un nombre'))
    }
    return ok(new Category({ ...props, name: props.name.trim() }))
  }

  get id(): string {
    return this.props.id
  }
  get name(): string {
    return this.props.name
  }
  get kind(): CategoryKind {
    return this.props.kind
  }
  get accountCode(): string | null {
    return this.props.accountCode
  }
  get sortOrder(): number {
    return this.props.sortOrder
  }
  get active(): boolean {
    return this.props.active
  }
  get colorIndex(): number | null {
    return this.props.colorIndex
  }
  get version(): number {
    return this.props.version ?? 0
  }

  // Lo que queda después de guardarse: la base sube la versión en cada escritura.
  guardada(): Category {
    return new Category({ ...this.props, version: this.version + 1 })
  }

  isPostable(): boolean {
    return this.props.accountCode !== null && this.props.active
  }

  toProps(): CategoryProps {
    return { ...this.props }
  }
}
