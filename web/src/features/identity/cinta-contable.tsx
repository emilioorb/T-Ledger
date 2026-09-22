import { copy } from './copy'
import { usarCinta } from './usar-cinta'

// El rollo de papel que da nombre al producto. Sube sin fin, con asientos de verdad impresos
// en dos columnas, y los dos extremos desvanecidos para que se lea como una cinta que sigue
// fuera de la pantalla.
//
// Es la única demostración que Tape Ledger puede dar de sí mismo sin inventar nada: no dice
// que lleva partida doble, la muestra treinta líneas seguidas. Cada asiento suma lo mismo en
// el debe y en el haber, y eso se ve sin leer un solo rótulo.

interface Linea {
  cuenta: string
  debe?: string
  haber?: string
}

interface Asiento {
  // Días hacia atrás desde hoy. Las fechas se calculan al renderizar en vez de escribirse:
  // una cinta fechada en setiembre de 2026 es creíble en setiembre de 2026 y delata la
  // pantalla para siempre después.
  hace: number
  numero: string
  lineas: [Linea, Linea]
}

const ASIENTOS: Asiento[] = [
  {
    hace: 0,
    numero: '0418',
    lineas: [
      { cuenta: '1101  Caja', debe: '250 000,00' },
      { cuenta: '4100  Salario', haber: '250 000,00' },
    ],
  },
  {
    hace: 1,
    numero: '0417',
    lineas: [
      { cuenta: '5210  Mercado', debe: '47 350,00' },
      { cuenta: '1102  BAC Colones', haber: '47 350,00' },
    ],
  },
  {
    hace: 3,
    numero: '0416',
    lineas: [
      { cuenta: '5100  Alquiler', debe: '180 000,00' },
      { cuenta: '1101  Caja', haber: '180 000,00' },
    ],
  },
  {
    hace: 5,
    numero: '0415',
    lineas: [
      { cuenta: '2100  Préstamo', debe: '62 500,00' },
      { cuenta: '1102  BAC Colones', haber: '62 500,00' },
    ],
  },
  {
    hace: 8,
    numero: '0414',
    lineas: [
      { cuenta: '1301  Inversión', debe: '120 000,00' },
      { cuenta: '1102  BAC Colones', haber: '120 000,00' },
    ],
  },
  {
    hace: 11,
    numero: '0413',
    lineas: [
      { cuenta: '5320  Gasolina', debe: '22 000,00' },
      { cuenta: '1103  Tarjeta', haber: '22 000,00' },
    ],
  },
  {
    hace: 13,
    numero: '0412',
    lineas: [
      { cuenta: '5410  Internet', debe: '29 900,00' },
      { cuenta: '1102  BAC Colones', haber: '29 900,00' },
    ],
  },
  {
    hace: 16,
    numero: '0411',
    lineas: [
      { cuenta: '1102  BAC Colones', debe: '95 000,00' },
      { cuenta: '4200  Trabajo aparte', haber: '95 000,00' },
    ],
  },
]

// En UTC, igual que las fechas que viajan a la API: correrlas en local desplaza el día según
// la zona horaria, que es la trampa que `lib/dates` evita en el resto de la app.
const fechaDe = (hace: number): string => {
  const fecha = new Date()
  fecha.setUTCDate(fecha.getUTCDate() - hace)
  const dia = String(fecha.getUTCDate()).padStart(2, '0')
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

// Las tres columnas viven acá y no en cada fila: el encabezado tiene que caer exactamente
// sobre los montos, y dos grillas que se parecen terminan desalineadas la primera vez que
// alguien toca un ancho.
const COLUMNAS = 'grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 px-6 2xl:gap-x-4 2xl:px-8'
const CIFRA = 'w-[5.5rem] text-right tabular-nums 2xl:w-[6.5rem]'

const Renglon = ({ asiento }: { asiento: Asiento }) => (
  // El asiento bajo el cursor sube de contraste: es lo que explica por qué la cinta se
  // frenó, y premia a quien se detuvo a leerlo. `hover:` de Tailwind ya sale envuelto en
  // `@media (hover: hover)`, así que un toque no lo dispara.
  <div className="border-b border-border/60 py-3 transition-colors duration-(--duration-overlay) hover:bg-foreground/[0.035]">
    <div className="mb-1.5 flex items-baseline justify-between px-6 text-[0.625rem] text-muted-foreground 2xl:px-8">
      <span className="tabular-nums">{fechaDe(asiento.hace)}</span>
      <span className="tabular-nums">#{asiento.numero}</span>
    </div>
    {asiento.lineas.map((linea) => (
      <div key={linea.cuenta} className={`${COLUMNAS} text-[0.6875rem] leading-5`}>
        <span className="truncate">{linea.cuenta}</span>
        <span className={CIFRA}>{linea.debe}</span>
        <span className={`${CIFRA} text-muted-foreground`}>{linea.haber}</span>
      </div>
    ))}
  </div>
)

export const CintaContable = () => {
  const { zona, rollo } = usarCinta<HTMLDivElement, HTMLDivElement>()

  return (
    // `aria-hidden` porque es la ilustración del titular, no información: leída en voz alta es
    // una ristra de números sin el gesto que los explica, y el texto de abajo ya dice en
    // palabras lo que la cinta muestra.
    <div ref={zona} className="flex min-h-0 flex-1 flex-col font-mono" aria-hidden="true">
      {/* El encabezado queda fijo mientras el rollo corre por debajo: sin él, dos montos
          iguales en lugares distintos no dicen nada a quien no lleva contabilidad. Va fuera
          de la parte que se mueve y fuera del desvanecido, que si no se borraría solo. */}
      <div
        className={`${COLUMNAS} border-b border-border py-2.5 text-[0.625rem] text-muted-foreground`}
      >
        <span>{copy.panel.account}</span>
        <span className={CIFRA}>{copy.panel.debit}</span>
        <span className={CIFRA}>{copy.panel.credit}</span>
      </div>

      <div className="cinta cinta-entra relative min-h-0 flex-1 overflow-hidden">
        {/* La lista va dos veces: la animación traslada media altura, así que al terminar la
            vuelta lo que se ve es el comienzo de la segunda copia, idéntico al de la
            primera. */}
        <div ref={rollo} className="cinta-sube absolute inset-x-0 top-0">
          {[0, 1].map((copia) => (
            <div key={copia}>
              {ASIENTOS.map((asiento) => (
                <Renglon key={asiento.numero} asiento={asiento} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
