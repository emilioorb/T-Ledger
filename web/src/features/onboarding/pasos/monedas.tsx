import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { copy } from '../copy'

export type EleccionDeMonedas = 'CRC' | 'CRC+USD'

interface Props {
  valor: EleccionDeMonedas
  onCambio: (valor: EleccionDeMonedas) => void
}

export const Monedas = ({ valor, onCambio }: Props) => (
  <RadioGroup value={valor} onValueChange={(nuevo) => onCambio(nuevo as EleccionDeMonedas)} className="gap-0 divide-y rounded-lg border">
    {(
      [
        ['CRC', copy.monedas.soloColones],
        ['CRC+USD', copy.monedas.ambas],
      ] as const
    ).map(([clave, texto]) => (
      <Label key={clave} className="h-11 gap-3 px-3 font-normal">
        <RadioGroupItem value={clave} />
        {texto}
      </Label>
    ))}
  </RadioGroup>
)
