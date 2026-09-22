import { useState, type CSSProperties, type ReactNode } from 'react'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ASIENTOS, type Renglon } from './asientos'
import { copy } from './copy'
import { PATA } from './pata'
import { finDe, useSumadora, type Paso } from './sumadora'

type Lado = 'debe' | 'haber'

// El ancho de la cifra más larga de la T. Fijo en los dos lados para que las cifras alineen a
// la derecha también en el haber, donde el renglón arranca contra la pata.
const CIFRA = 'w-[12ch] shrink-0'

// Media columna, pegada a la pata. El relleno es lo único que separa la tinta de la línea, y
// la del debe lleva la línea misma.
const MEDIA: Record<Lado, string> = {
  debe: cn('pr-3 sm:pr-6 md:pr-8', PATA),
  haber: 'pl-3 sm:pl-6 md:pl-8',
}

const retrasado = (retraso: number): CSSProperties => ({ animationDelay: `${String(retraso)}ms` })

// Cada renglón sale de la pata hacia su lado: la frase de arriba se parte en dos a la vista.
// Se mueve el contenido y no la celda, porque la celda del debe es la que lleva la pata.
const desdeLaPata = (lado: Lado, retraso: number): CSSProperties =>
  ({ '--desde': lado === 'debe' ? '1.25rem' : '-1.25rem', ...retrasado(retraso) }) as CSSProperties

// Un renglón del asiento. La cifra queda contra la pata y la cuenta hacia afuera: en el haber
// la cifra va primero a la vista, pero no en el DOM, que se sigue leyendo cuenta y monto.
// En el teléfono la media columna no alcanza para las dos en una línea, y la cifra baja.
const Anotacion = ({
  lado,
  renglon,
  retraso,
  atenuada,
}: {
  lado: Lado
  renglon: Renglon
  retraso: number
  atenuada: boolean
}) => (
  <div className={MEDIA[lado]}>
    <p
      className={cn(
        'sale-de-la-pata flex min-w-0 flex-col gap-0.5 text-sm transition-colors duration-200 md:flex-row md:items-baseline md:gap-6',
        lado === 'debe' ? 'items-end md:justify-end' : 'items-start md:justify-start',
        atenuada && 'text-muted-foreground',
      )}
      style={desdeLaPata(lado, retraso)}
    >
      <span className="max-w-full truncate">
        <span className="sr-only">{lado === 'debe' ? copy.debe : copy.haber}: </span>
        {renglon.cuenta}
      </span>
      <span className={cn('num text-right', CIFRA, lado === 'haber' && 'md:order-first')}>
        {formatMoney(renglon.monto)}
      </span>
    </p>
  </div>
)

// La glosa narra el asiento entero, así que no es de ningún lado: cruza la T de borde a borde
// y la pata se corta para dejarla pasar.
const Glosa = ({ children, retraso }: { children: ReactNode; retraso: number }) => (
  <p
    className="asiento-entra col-span-2 px-3 py-[clamp(0.375rem,1.3dvh,1rem)] text-center text-sm text-muted-foreground"
    style={retrasado(retraso)}
  >
    {children}
  </p>
)

// El total corre desde que aparece la T, como la tira de una sumadora. La doble raya se traza
// recién cuando dejó de correr: se cierra una cuenta que ya dio, no una que todavía suma.
const Total = ({
  lado,
  monto,
  aparece,
  raya,
}: {
  lado: Lado
  monto: string
  aparece: number
  raya: number
}) => (
  <div className={cn('flex pt-[clamp(0.5rem,2.2dvh,1.5rem)]', MEDIA[lado], lado === 'debe' ? 'justify-end' : 'justify-start')}>
    <p
      className={cn('asiento-entra num relative pt-2 text-right text-sm', CIFRA)}
      style={retrasado(aparece)}
    >
      <span
        aria-hidden="true"
        className="raya-se-traza absolute inset-x-0 top-0 border-t-[3px] border-double border-foreground/40"
        style={retrasado(raya)}
      />
      {monto}
    </p>
  </div>
)

// Los tiempos de la escritura: la pata termina de bajar, y de ahí cada frase con su par.
const PRIMERA_GLOSA = 350
const ENTRE_ASIENTOS = 220
const DE_LA_FRASE_AL_PAR = 120
const retrasoDe = (indice: number) => PRIMERA_GLOSA + indice * ENTRE_ASIENTOS
const TRAZO = 450

// Un paso por asiento, cuando su par aparece. En colones enteros: los céntimos de estos
// asientos son cero, y una cifra que corre no necesita mostrar lo que no cambia.
const PASOS: readonly Paso[] = ASIENTOS.reduce<Paso[]>((pasos, asiento, indice) => {
  const anterior = pasos.at(-1)?.hasta ?? 0
  const colones = Number(BigInt(asiento.debe.monto.minorUnits) / 100n)
  return [...pasos, { en: retrasoDe(indice) + DE_LA_FRASE_AL_PAR, hasta: anterior + colones }]
}, [])
const CIERRA = finDe(PASOS)

// La cuenta T. El debe va a la izquierda y el haber a la derecha: si se invierte, la página
// deja de ser verdad y quien lleva libros lo ve antes de leer el titular.
export const CuentaT = ({ className }: { className?: string }) => {
  const [encendido, setEncendido] = useState<number | null>(null)

  const marca = useSumadora(PASOS)
  const total = formatMoney({ minorUnits: `${String(marca)}00`, currency: 'CRC' })

  return (
    <div className={cn('grid w-full grid-cols-2', className)}>
      {ASIENTOS.map((asiento, indice) => (
        <div
          key={asiento.glosa}
          className="contents"
          onPointerEnter={() => setEncendido(indice)}
          onPointerLeave={() => setEncendido(null)}
        >
          <Glosa retraso={retrasoDe(indice)}>«{asiento.glosa}»</Glosa>
          {(['debe', 'haber'] as const).map((lado) => (
            <Anotacion
              key={lado}
              lado={lado}
              renglon={asiento[lado]}
              retraso={retrasoDe(indice) + DE_LA_FRASE_AL_PAR}
              atenuada={encendido !== null && encendido !== indice}
            />
          ))}
        </div>
      ))}

      {/* La doble raya del cierre: `border-double` es la que usa la contabilidad desde que
          los libros eran de papel, y acá es el remate de la pata. */}
      <Total lado="debe" monto={total} aparece={PRIMERA_GLOSA} raya={CIERRA} />
      <Total lado="haber" monto={total} aparece={PRIMERA_GLOSA} raya={CIERRA} />

      <p
        className="asiento-entra col-span-2 px-3 py-[clamp(0.375rem,1.3dvh,1rem)] text-center text-sm text-muted-foreground"
        style={retrasado(CIERRA + TRAZO)}
      >
        {copy.cierre}
      </p>
    </div>
  )
}
