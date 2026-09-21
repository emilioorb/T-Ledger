import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { animoDe, NIMBO, type Senales } from './animo'
import { Bloub } from './bloub'

interface Props {
  senales: Senales
  className?: string
}

// La cara sola no explica nada: a 72 píxeles «desconfiado» y «confundido» son dos manchas
// parecidas, y aunque se distinguieran, nadie adivina que la culpa la tiene una cubeta.
// El tooltip es el que dice qué siente y, sobre todo, por qué, que es el dato accionable.
export const AnimoAvatar = ({ senales, className }: Props) => {
  const { gesto, siente, porque } = animoDe(senales)

  return (
    // Sin espera, contra los 300 ms del resto de la app. Ese retardo existe para que en una
    // fila de iconos el puntero pueda cruzarla sin encender cuatro tooltips al pasar; acá hay
    // un solo objeto, aislado en su esquina, al que uno llega a propósito. Esperar ahí no
    // protege de nada: solo hace que la cara parezca que no responde.
    <Tooltip delayDuration={0}>
      {/* Botón y no un `div` con `tabIndex`: el tooltip tiene que abrirse también con el
          teclado, y lo único que el navegador enfoca y anuncia por su cuenta es un control
          de verdad. No navega a ningún lado a propósito, porque lo que tiene para decir cabe
          entero en dos renglones. */}
      <TooltipTrigger
        className={cn(
          'rounded-full transition-transform duration-(--duration-press) ease-(--ease-out-quart) hover:scale-105 active:scale-97 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className,
        )}
        aria-label={`${NIMBO}. ${siente}. ${porque}`}
      >
        <Bloub gesto={gesto} className="h-auto w-full" />
      </TooltipTrigger>

      {/* El tooltip viene armado para una línea suelta: acá son dos párrafos, uno el ánimo y
          otro la razón, así que se endereza y la razón va más apagada.

          El nombre va pegado al ánimo y no en su propio renglón: presentarse merece una
          palabra, no un tercer nivel de jerarquía en una caja que se lee de reojo. */}
      <TooltipContent
        side="left"
        sideOffset={8}
        collisionPadding={12}
        className="max-w-64 flex-col items-stretch gap-0.5 py-2"
      >
        <p>
          <span className="text-background/60">{NIMBO} ·</span>{' '}
          <span className="font-medium">{siente}</span>
        </p>
        <p className="text-background/70">{porque}</p>
      </TooltipContent>
    </Tooltip>
  )
}
