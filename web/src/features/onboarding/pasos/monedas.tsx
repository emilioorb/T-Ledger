import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { copy } from '../copy'

export type EleccionDeMonedas = 'CRC' | 'CRC+USD'

interface Props {
  valor: EleccionDeMonedas
  onCambio: (valor: EleccionDeMonedas) => void
}

export const Monedas = ({ valor, onCambio }: Props) => (
  <RadioGroup value={valor} onValueChange={(nuevo) => onCambio(nuevo as EleccionDeMonedas)} className="gap-3">
    {(
      [
        ['CRC', copy.monedas.soloColones],
        ['CRC+USD', copy.monedas.ambas],
      ] as const
    ).map(([clave, texto]) => (
      <Label key={clave} className="flex items-center gap-3 rounded-lg border border-border p-3 has-data-[state=checked]:border-primary">
        <RadioGroupItem value={clave} />
        {texto}
      </Label>
    ))}
  </RadioGroup>
)
