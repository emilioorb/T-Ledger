import { copy } from '../copy'

interface Props {
  resumen: { bancos: number; categorias: number; saldos: boolean; ingreso: boolean }
}

export const Cierre = ({ resumen }: Props) => {
  const lineas = [
    resumen.bancos > 0 ? copy.cierre.resumen.bancos(resumen.bancos) : null,
    resumen.categorias > 0 ? copy.cierre.resumen.categorias(resumen.categorias) : null,
    resumen.saldos ? copy.cierre.resumen.saldos : null,
    resumen.ingreso ? copy.cierre.resumen.ingreso : null,
  ].filter((linea): linea is string => linea !== null)

  if (lineas.length === 0) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.nada}</p>
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {lineas.map((linea) => (
        <li key={linea}>{linea}</li>
      ))}
    </ul>
  )
}
