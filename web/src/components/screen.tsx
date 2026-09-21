import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

// El encabezado de una pantalla no depende de que la consulta haya respondido: en carga y en
// error la pantalla se quedaba sin `h1`, y quien navega por encabezados no tenía dónde
// aterrizar. En esos dos estados el título es el de la sección, que es lo único cierto
// todavía; cuando llegan los datos, cada pantalla pone el suyo.
export const Screen = ({ title, children }: Props) => (
  <div className="space-y-5">
    <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
    {children}
  </div>
)
