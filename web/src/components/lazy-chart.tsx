import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  // El alto del hueco tiene que ser el del gráfico: si no, al llegar el código la página
  // salta justo donde el usuario estaba mirando.
  height: string
  children: ReactNode
}

// Recharts pesa 98 kB comprimidos y el tablero lo pedía en el arranque, cuando todavía no hay
// nada que dibujar. Ahora sale del camino crítico y, además, no se pide hasta que el gráfico
// está por entrar en pantalla: en un teléfono, el de tendencia queda debajo del pliegue y no
// cuesta nada hasta que se baja. Mientras tanto se ve el mismo esqueleto que mientras llegan
// los datos.
export const LazyChart = ({ height, children }: Props) => {
  const hueco = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const nodo = hueco.current
    // Sin IntersectionObserver —o si el nodo ya no está— se dibuja y punto: quedarse sin
    // gráfico es peor que cargarlo de más.
    if (!nodo || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisible(true)
          observador.disconnect()
        }
      },
      // Un margen generoso: el código empieza a bajar antes de que el gráfico se vea.
      { rootMargin: '400px' },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  return (
    <div ref={hueco}>
      {visible ? (
        <Suspense fallback={<Skeleton className={`${height} w-full`} />}>{children}</Suspense>
      ) : (
        <Skeleton className={`${height} w-full`} />
      )}
    </div>
  )
}
