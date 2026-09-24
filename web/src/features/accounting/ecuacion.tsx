import type { ReactNode } from 'react'

interface Termino {
  operador: '=' | '+'
  valor: ReactNode
}

// Una identidad contable escrita como se lee: el resultado y después sus términos. Cada
// operador va pegado al monto que le sigue: partida en cualquier lado, la línea terminaba en
// un «=» o un «+» colgando. En una tarjeta angosta cada término va en su renglón, alineado.
export const Ecuacion = ({ resultado, terminos }: { resultado: ReactNode; terminos: Termino[] }) => (
  <div className="flex flex-col items-start gap-y-1 @xl:flex-row @xl:flex-wrap @xl:items-baseline @xl:gap-x-3">
    {resultado}
    {terminos.map(({ operador, valor }, indice) => (
      <span key={indice} className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="w-4 text-2xl text-muted-foreground">{operador}</span>
        {valor}
      </span>
    ))}
  </div>
)
