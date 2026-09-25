import { CheckIcon } from 'lucide-react'
import { copy } from '../copy'

interface Props {
  resumen: { bancos: number; categorias: number; saldos: boolean; ingreso: boolean }
}

interface Linea {
  clave: string
  texto: string
  cifra?: number
}

const lineasDe = ({ bancos, categorias, saldos, ingreso }: Props['resumen']): Linea[] => {
  const lineas: Linea[] = []
  if (bancos > 0) lineas.push({ clave: 'bancos', cifra: bancos, texto: copy.cierre.resumen.bancos(bancos) })
  if (categorias > 0) lineas.push({ clave: 'categorias', cifra: categorias, texto: copy.cierre.resumen.categorias(categorias) })
  if (saldos) lineas.push({ clave: 'saldos', texto: copy.cierre.resumen.saldos })
  if (ingreso) lineas.push({ clave: 'ingreso', texto: copy.cierre.resumen.ingreso })
  return lineas
}

export const Cierre = ({ resumen }: Props) => {
  const lineas = lineasDe(resumen)
  if (lineas.length === 0) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.nada}</p>
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {lineas.map(({ clave, cifra, texto }) => (
        <li key={clave} className="flex items-center gap-2 px-3 py-2">
          <CheckIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          {/* La cifra en mono aunque viva dentro de una frase. */}
          <span>
            {cifra === undefined ? texto : <><span className="num">{cifra}</span> {texto}</>}
          </span>
        </li>
      ))}
    </ul>
  )
}
