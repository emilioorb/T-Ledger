import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { AccountClass } from './account-class.js'

export interface AccountProps {
  readonly code: string
  readonly name: string
  readonly accountClass: AccountClass
  readonly parentCode: string | null
  readonly active: boolean
  readonly sortOrder: number
  // El tránsito entre monedas no es una tenencia: ver el comentario del esquema. Es opcional
  // porque casi ninguna cuenta lo es, y una cuenta nueva no debería tener que declararlo.
  readonly isCurrencyBridge?: boolean
  // La versión de la fila sobre la que se armó (6b). Opcional al crear: nace en 0.
  readonly version?: number
}

export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(props: AccountProps): Result<Account, RangeError> {
    if (!/^\d{3,10}$/.test(props.code)) {
      return err(
        new RangeError(`El código de cuenta debe ser numérico, se recibió «${props.code}»`),
      )
    }
    if (props.name.trim().length === 0) {
      return err(new RangeError('La cuenta necesita un nombre'))
    }
    if (props.parentCode !== null && props.parentCode === props.code) {
      return err(new RangeError('Una cuenta no puede ser su propia madre'))
    }
    return ok(
      new Account({
        ...props,
        name: props.name.trim(),
        isCurrencyBridge: props.isCurrencyBridge ?? false,
      }),
    )
  }

  get code(): string {
    return this.props.code
  }
  get name(): string {
    return this.props.name
  }
  get accountClass(): AccountClass {
    return this.props.accountClass
  }
  get parentCode(): string | null {
    return this.props.parentCode
  }
  get active(): boolean {
    return this.props.active
  }
  get version(): number {
    return this.props.version ?? 0
  }

  // Lo que queda después de guardarse: la base sube la versión en cada escritura.
  guardada(): Account {
    return new Account({ ...this.props, version: this.version + 1 })
  }
  get sortOrder(): number {
    return this.props.sortOrder
  }
  get isCurrencyBridge(): boolean {
    return this.props.isCurrencyBridge === true
  }

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
