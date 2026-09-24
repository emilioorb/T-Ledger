import { AnimoAvatar } from './animo-avatar'
import type { Senales } from './animo'
import { copy } from './copy'

interface Props {
  nombre: string
  senales: Senales
  // Lo que pasa hoy en el libro, en una línea. Va como texto ya armado porque quien lo sabe
  // es el tablero, que ya tiene las cifras a mano.
  resumen: string
}

// Cuatro franjas en una sola barra: la fecha, el saludo, lo que pasa hoy y la mascota.
//
// La fecha va en un bloque de otro tono y no en una tarjeta aparte: es la misma información
// —hoy—, y separarla en dos cajas obligaría a leer dos veces lo que se entiende de un vistazo.
// La profundidad la da el tono, como manda DESIGN.md, no una sombra.
const AHORA = () => new Date()

const saludoDe = (hora: number): string => {
  if (hora < 12) return copy.tablero.morning
  if (hora < 19) return copy.tablero.afternoon
  return copy.tablero.night
}

export const CabeceraDelTablero = ({ nombre, senales, resumen }: Props) => {
  const hoy = AHORA()
  const dia = hoy.getDate()
  const semana = hoy.toLocaleDateString('es-CR', { weekday: 'long' })
  const mes = hoy.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' })

  return (
    // En el teléfono la fecha va arriba y el saludo abajo, entero: lado a lado, la fecha se
    // llevaba media barra y el saludo quedaba en «Buenas noc…».
    <header className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:flex-row sm:items-stretch">
      {/* El número grande en mono, como toda cifra del producto: una fecha es un dato, y acá
          es el dato que ordena todo lo que viene abajo. */}
      <div className="flex shrink-0 items-center gap-3 bg-background px-5 py-3 sm:py-4">
        <span className="num text-5xl leading-none font-semibold tabular-nums">{dia}</span>
        <span className="grid leading-tight">
          <span className="text-sm font-medium capitalize">{semana}</span>
          <span className="num text-xs text-muted-foreground capitalize">
            {mes.replace('.', '')}
          </span>
        </span>
        {/* En el teléfono la mascota va al final de la fila de la fecha, más chica: al lado
            del saludo no le quedaba lugar. En pantallas anchas vuelve a su sitio de abajo. */}
        <AnimoAvatar senales={senales} className="ml-auto w-10 shrink-0 sm:hidden" />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-pretty sm:truncate sm:text-xl">
            {saludoDe(hoy.getHours())}, {nombre}
          </p>
          {/* Un dato del libro y no una frase de almanaque: este producto no felicita, dice
              cómo va la cosa. */}
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty sm:truncate">{resumen}</p>
        </div>

        {/* Adentro de la barra y al final, del tamaño en que la cara se distingue. Se va con
            la página en vez de quedar fija: algo que respira encima de las cifras competiría
            por la atención justo donde hay números que leer. */}
        <AnimoAvatar senales={senales} className="hidden w-14 shrink-0 sm:block" />
      </div>
    </header>
  )
}
