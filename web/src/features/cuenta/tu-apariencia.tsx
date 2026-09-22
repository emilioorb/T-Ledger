import { PaletteIcon } from 'lucide-react'
import { ColorPicker } from '@/components/color-picker'
import { Button } from '@/components/ui/button'
import { colorDeNimbo, colorDeNimboCss } from '@/lib/nimbo'
import { applyTheme, tema, temaDelSistema, type Preferencia } from '@/lib/theme'
import { copy } from './copy'
import { Seccion } from './seccion'

const OPCIONES: Preferencia[] = ['dark', 'light', 'system']

// El tema y el color de la mascota. Los dos son de este navegador y no de la cuenta, y la
// línea de la sección lo dice: entrar desde otra computadora no arrastra la elección, que es
// lo que uno espera de algo que depende de la pantalla y de la luz del cuarto.
//
// Sin vista previa acá: Nimbo está arriba, en la cabecera, del tamaño en que se lo ve de
// verdad. Poner una segunda copia al lado del selector sería mostrar dos veces lo mismo en la
// misma pantalla.
export const TuApariencia = () => {
  const preferencia = tema.usar()
  const color = colorDeNimbo.usar()

  return (
    <Seccion title={copy.apariencia.title} hint={copy.apariencia.hint} icon={PaletteIcon}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">{copy.apariencia.theme}</p>

          {/* Tres botones y no un desplegable: son tres opciones, se ven las tres de una y
              elegir cuesta un clic en vez de tres. */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.apariencia.theme}>
            {OPCIONES.map((opcion) => (
              <Button
                key={opcion}
                type="button"
                size="sm"
                variant={preferencia === opcion ? 'secondary' : 'ghost'}
                aria-pressed={preferencia === opcion}
                onClick={() => applyTheme(opcion)}
              >
                {copy.apariencia.themes[opcion]}
              </Button>
            ))}
          </div>

          {/* Qué significa hoy «el del sistema». Sin esto, quien lo elige no sabe si quedó en
              claro o en oscuro hasta que el sistema cambie. */}
          {preferencia === 'system' ? (
            <p className="text-xs text-muted-foreground">
              {copy.apariencia.systemHint(copy.apariencia.themes[temaDelSistema()])}
            </p>
          ) : null}
        </div>

        <ColorPicker
          value={color}
          onChange={colorDeNimbo.poner}
          colorDeLaFicha={colorDeNimboCss}
          label={copy.apariencia.nimbo}
          autoLabel={copy.apariencia.nimboAuto}
        />
      </div>
    </Seccion>
  )
}
