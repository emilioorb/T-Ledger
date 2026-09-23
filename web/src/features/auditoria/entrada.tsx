import { copy } from './copy'
import { nombreDeCampo, valorLegible } from './legible'
import type { CambioDeRastro, EntidadAuditada, EntradaDeRastro } from './types'
import { cn } from '@/lib/utils'

const esEntidadConocida = (entity: string): entity is EntidadAuditada =>
  entity in copy.audit.singular

// Una frase, no tres columnas de jerga: «Emilio editó un movimiento». Lo que la fila tiene que
// contestar es qué pasó, y una tabla con «entity» y «action» obliga a traducir mentalmente en
// cada renglón.
export const QuePaso = ({ entrada }: { entrada: EntradaDeRastro }) => {
  const accion =
    entrada.action in copy.audit.actions
      ? copy.audit.actions[entrada.action as keyof typeof copy.audit.actions]
      : entrada.action
  const cosa = esEntidadConocida(entrada.entity)
    ? copy.audit.singular[entrada.entity]
    : entrada.entity

  return (
    <span>
      {accion} {cosa}
    </span>
  )
}

// Los cambios ya listos para mostrar. Un campo cuyo valor no se puede mostrar —la lista de
// aportes vacía de una meta recién creada— se cae acá: ocuparía una línea para decir que no
// pasó nada.
const paraMostrar = (cambios: CambioDeRastro[], nombres?: Map<string, string>) =>
  cambios
    .map((cambio) => ({
      campo: cambio.campo,
      antes: valorLegible(cambio.antes, nombres),
      despues: valorLegible(cambio.despues, nombres),
    }))
    .filter(({ antes, despues }) => antes !== null || despues !== null)

const Vacio = () => <span className="text-muted-foreground">{copy.audit.noFields}</span>

const Campo = ({ campo }: { campo: string }) => (
  <span className="text-muted-foreground">{nombreDeCampo(campo)}</span>
)

// Al crear no hay valor anterior: mostrar «— → algo» inventaría un estado previo que nunca
// existió. La flecha hace el trabajo de la frase «pasó de … a …» en un carácter.
//
// En el detalle abierto el valor se parte: vive dentro de una celda de tabla, que no deja partir
// el texto, y unas notas o la clave de un archivo se estiraban en un renglón hasta salirse de
// la pantalla. Conserva los saltos de línea de lo que se escribió en varias.
const PARTIDO = 'whitespace-pre-wrap [overflow-wrap:anywhere]'

interface ValoresProps {
  antes: string | null
  despues: string | null
  partido?: boolean
}

const DeAHacia = ({ antes, despues, partido = false }: ValoresProps) => (
  <>
    {antes === null ? null : (
      <>
        <span className={cn('num line-through opacity-60', partido && PARTIDO)}>{antes}</span>
        <span aria-hidden="true" className="text-muted-foreground">
          →
        </span>
      </>
    )}
    <span className={cn('num', partido && PARTIDO)}>{despues ?? copy.audit.noFields}</span>
  </>
)

// El detalle en **una línea**, para que todas las filas de la tabla midan lo mismo. Una fila de
// «editó» ocupaba un renglón y una de «creó» seis, y la tabla se leía como una escalera: el ojo
// pierde la columna de la izquierda cuando los renglones no se alinean.
//
// Lo que no entra se corta, pero no se pierde: la fila se abre y muestra todo.
interface DetalleProps {
  cambios: CambioDeRastro[]
  // Con qué traducir los identificadores guardados. Lo arma la pantalla, que es la que ya
  // tiene el catálogo cargado.
  nombres?: Map<string, string>
}

export const DetalleEnLinea = ({ cambios, nombres }: DetalleProps) => {
  const visibles = paraMostrar(cambios, nombres)
  if (visibles.length === 0) return <Vacio />

  return (
    <span className="flex items-baseline gap-x-3 truncate text-xs">
      {visibles.map(({ campo, antes, despues }) => (
        <span key={campo} className="flex shrink-0 items-baseline gap-x-1.5">
          <Campo campo={campo} />
          <DeAHacia antes={antes} despues={despues} />
        </span>
      ))}
    </span>
  )
}

// El mismo detalle, apilado, para cuando la fila está abierta.
export const DetalleCompleto = ({ cambios, nombres }: DetalleProps) => {
  const visibles = paraMostrar(cambios, nombres)
  if (visibles.length === 0) return <Vacio />

  return (
    <ul className="space-y-0.5">
      {visibles.map(({ campo, antes, despues }) => (
        <li key={campo} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
          <Campo campo={campo} />
          <DeAHacia antes={antes} despues={despues} partido />
        </li>
      ))}
    </ul>
  )
}
