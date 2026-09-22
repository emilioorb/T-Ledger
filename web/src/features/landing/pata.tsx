import { cn } from '@/lib/utils'

// La pata de la T no es una línea tendida encima de la página: es el borde derecho de la media
// columna izquierda, renglón por renglón. Así cae exactamente donde parte cada grilla de dos
// columnas, y se corta donde una frase la cruza sin que nada tenga que taparla. Tapar no
// sirve: el campo de puntos tiene viñeta, así que ningún color liso coincide con el papel, y
// cada tapón se leía como un parche.
export const PATA = 'border-r border-foreground/35'

// Un tramo sin nada al lado: lo que baja del travesaño y lo que llega al pie.
export const Tramo = ({ className }: { className?: string }) => (
  <div aria-hidden="true" className={cn('pata-crece w-1/2', PATA, className)} />
)
