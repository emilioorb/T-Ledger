import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { copy } from './copy'
import type { Paso } from './orden'
import { FORM_ID } from './pasos/intro'

export type Destino = '/guia' | '/presupuesto/modelos'

interface Props {
  paso: Paso
  conFormulario: boolean
  ocupado: boolean
  conError: boolean
  onAvanzar: () => void
  onRetroceder: () => void
  onIr: (destino: Destino) => void
}

// 44 px en el teléfono, donde se toca con el pulgar; la altura de siempre en el escritorio.
const TACTIL = 'h-11 sm:h-9'
// En el teléfono el botón principal ocupa lo que queda del pie; en el escritorio, lo suyo: ahí
// el grupo deja de ser flex (`sm:block`), `flex-1` no aplica y los botones se alinean a la
// derecha como texto. Por eso el espacio entre ellos es un margen y no un `gap`.
const PRINCIPAL = `${TACTIL} flex-1`
const SEGUNDO = 'ml-2'

const Acciones = ({ paso, conFormulario, ocupado, conError, onAvanzar, onIr }: Omit<Props, 'onRetroceder'>) => {
  if (paso === 'intro') {
    return (
      <Button className={PRINCIPAL} onClick={onAvanzar}>
        {copy.botones.empezar}
      </Button>
    )
  }
  if (paso === 'cierre') {
    return (
      <>
        <Button variant="outline" className={PRINCIPAL} onClick={() => onIr('/presupuesto/modelos')}>
          {copy.cierre.modelos}
        </Button>
        <Button className={`${PRINCIPAL} ${SEGUNDO}`} onClick={() => onIr('/guia')}>
          {copy.cierre.guia}
        </Button>
      </>
    )
  }
  if (!conFormulario) {
    return (
      <Button key={paso} className={PRINCIPAL} onClick={onAvanzar}>
        {copy.botones.siguiente}
      </Button>
    )
  }
  // Una `key` por paso: sin ella React reusa el mismo <button> de un paso sin formulario en el
  // siguiente con formulario, y la acción por defecto del clic lo envía vacío.
  return (
    <>
      <Button variant="ghost" className={`${TACTIL} text-muted-foreground`} onClick={onAvanzar} disabled={ocupado}>
        {copy.botones.saltar}
      </Button>
      <Button key={paso} type="submit" form={FORM_ID} className={`${PRINCIPAL} ${SEGUNDO}`} disabled={ocupado}>
        {conError ? copy.botones.reintentar : copy.botones.siguiente}
      </Button>
    </>
  )
}

// El pie deja libre la barra de inicio del iPhone. `env()` vale 0 mientras `index.html` no
// declare `viewport-fit=cover`, así que hoy queda el padding de siempre.
const PADDING = 'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'

export const Pie = ({ onRetroceder, ...props }: Props) => (
  <DialogFooter className={`flex-nowrap border-t ${PADDING}`}>
    {props.paso === 'intro' || props.paso === 'cierre' ? null : (
      <Button variant="ghost" className={TACTIL} onClick={onRetroceder} disabled={props.ocupado}>
        {copy.botones.atras}
      </Button>
    )}
    <div className="flex flex-1 text-right sm:block">
      <Acciones {...props} />
    </div>
  </DialogFooter>
)
