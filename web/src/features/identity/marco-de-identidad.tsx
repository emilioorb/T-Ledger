import { ShieldCheckIcon } from 'lucide-react'
import { useLayoutEffect, type ReactNode } from 'react'
import { TEXT_LINK } from '@/components/text-link'
import { Bloub, type NombreDeGesto } from '@/features/shell/bloub'
import { copy as shell } from '@/features/shell/copy'
import { forceTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { copy } from './copy'
import { FondoDePuntos } from './fondo-de-puntos'
import { PanelDeConfianza } from './panel-de-confianza'

interface Props {
  // Lo único que cambia entre una pantalla y otra, además del contenido: cómo se siente Nimbo.
  gesto: NombreDeGesto
  children: ReactNode
}

// Las pantallas donde todavía no sos nadie comparten todo menos el formulario: el campo de
// puntos, la tarjeta de vidrio, la marca, el enlace de ayuda, la cinta y la garantía del pie.
// Vive acá y no en la ruta de entrar porque la de crear cuenta es la misma pantalla con otro
// formulario adentro, y dos copias del marco se desincronizan a la primera corrección.
export const MarcoDeIdentidad = ({ gesto, children }: Props) => {
  // Papel blanco con tinta negra, sea cual sea el tema del resto de la app, y antes del primer
  // pintado: en un efecto normal la pantalla asoma con el tema viejo durante un cuadro y da un
  // parpadeo. Al salir, el documento vuelve a la preferencia de la persona.
  useLayoutEffect(() => forceTheme('light'), [])

  // El campo de puntos ocupa la página entera y la tarjeta flota encima. Adentro, dos columnas
  // desde `lg`: el formulario a la izquierda y lo que el producto puede demostrar de sí mismo
  // a la derecha. Abajo de `lg` el panel desaparece entero en vez de apilarse: en un teléfono,
  // entrar es la tarea, y lo demás sería ruido debajo del pliegue.
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background p-4 sm:p-8">
      <FondoDePuntos />

      {/* Tres escalas y no una. En una laptop de 1280 la tarjeta de 1024 ocupaba el ochenta
          por ciento del ancho y tres cuartos del alto: lo mismo que en un monitor grande, y
          por eso se veía apretada. El corte es `2xl` y no `xl` porque `xl` **es** 1280: una
          laptop caía del lado grande. Desde 1536 recupera su tamaño entero. */}
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card/40 shadow-lg backdrop-blur-md lg:grid-cols-2 2xl:max-w-5xl">
        <section className="flex flex-col px-6 py-8 sm:px-8 2xl:px-10 2xl:py-10">
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
            {/* La marca arriba, la misma que la barra lateral: quien ya usó la app la
                reconoce, y quien no, la ve por primera vez donde corresponde. En monoespaciada
                porque Tape Ledger se llama así por la cinta impresa donde cada operación queda
                en orden, y Geist Mono ya está cargada para las cifras. */}
            <header className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2.5">
                <Bloub
                  gesto={gesto}
                  // A este tamaño el ojo mide menos de tres píxeles reales —nueve unidades de
                  // un viewBox de 206— y el antialiasing lo suaviza: es el precio de que la
                  // mascota acompañe al nombre en vez de ganarle. Si alguna vez se ve sucia,
                  // el problema es la escala y no el SVG.
                  className="h-auto w-8 shrink-0"
                />
                <span className="font-mono text-lg font-medium tracking-tight">
                  {shell.app.name}
                </span>
              </span>

              {/* Un correo y no un formulario de soporte: quien no puede entrar ya está
                  trabado, y mandarlo a otra pantalla es trabarlo dos veces. El asunto va
                  escrito para que el mensaje llegue diciendo qué pasa. */}
              <a
                href={`mailto:${copy.marco.correoDeAyuda}?subject=${encodeURIComponent(copy.marco.asuntoDeAyuda)}`}
                className={cn('text-sm', TEXT_LINK)}
              >
                {copy.marco.ayuda}
              </a>
            </header>

            <div className="my-auto py-8 2xl:py-10">{children}</div>

            {/* El pie de la tarjeta: lo que el producto garantiza, no lo que le gustaría
                garantizar. */}
            <footer className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {copy.marco.privacidad}
            </footer>
          </div>
        </section>

        <PanelDeConfianza />
      </div>
    </main>
  )
}
