import { err, ok, type Result } from '../../../shared/kernel/result.js'

export type CsvEncoding = 'utf-8' | 'latin1'
export type CsvDateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD'

export interface ImportProfileProps {
  readonly id: string
  readonly name: string
  readonly delimiter: string
  readonly encoding: CsvEncoding
  readonly headerRows: number
  readonly dateColumn: number
  readonly dateFormat: CsvDateFormat
  readonly descriptionColumn: number
  readonly referenceColumn: number | null
  readonly amountColumn: number | null
  readonly debitColumn: number | null
  readonly creditColumn: number | null
  readonly decimalSeparator: '.' | ','
  readonly thousandsSeparator: string | null
}

export class ImportProfile {
  private constructor(private readonly props: ImportProfileProps) {}

  static create(props: ImportProfileProps): Result<ImportProfile, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('El perfil necesita un nombre'))
    }
    if (props.delimiter.length !== 1) {
      return err(new RangeError('El delimitador es un solo carácter'))
    }
    if (props.headerRows < 0) {
      return err(new RangeError('Las filas de encabezado no pueden ser negativas'))
    }
    // Si el separador de miles es el mismo que el decimal, «1,234,56» se lee como 123.456:
    // el monto queda multiplicado por cien y el extracto importa sin una sola queja.
    if (props.thousandsSeparator === props.decimalSeparator) {
      return err(new RangeError('El separador de miles no puede ser el mismo que el decimal'))
    }

    const hasAmount = props.amountColumn !== null
    const hasPair = props.debitColumn !== null && props.creditColumn !== null
    const hasHalfPair = (props.debitColumn === null) !== (props.creditColumn === null)

    if (hasHalfPair) {
      return err(new RangeError('Débito y crédito van juntos: o están los dos o no está ninguno'))
    }
    if (hasAmount === hasPair) {
      return err(
        new RangeError(
          'Un perfil usa una columna de monto con signo o el par débito y crédito, nunca los dos ni ninguno',
        ),
      )
    }

    return ok(new ImportProfile({ ...props, name: props.name.trim() }))
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get delimiter(): string { return this.props.delimiter }
  get encoding(): CsvEncoding { return this.props.encoding }
  get headerRows(): number { return this.props.headerRows }
  get dateColumn(): number { return this.props.dateColumn }
  get dateFormat(): CsvDateFormat { return this.props.dateFormat }
  get descriptionColumn(): number { return this.props.descriptionColumn }
  get referenceColumn(): number | null { return this.props.referenceColumn }
  get amountColumn(): number | null { return this.props.amountColumn }
  get debitColumn(): number | null { return this.props.debitColumn }
  get creditColumn(): number | null { return this.props.creditColumn }
  get decimalSeparator(): '.' | ',' { return this.props.decimalSeparator }
  get thousandsSeparator(): string | null { return this.props.thousandsSeparator }

  toProps(): ImportProfileProps {
    return { ...this.props }
  }
}
