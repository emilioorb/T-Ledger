import { lazy, Suspense, useLayoutEffect, type ReactNode } from 'react'
import { forceTheme, temaDeEntrada } from '@/lib/theme'

// Aparte porque arrastra Three.js: la primera pantalla que ve un desconocido no tiene por qué
// esperarlo. La página pinta en papel liso y los puntos llegan después.
const FondoDePuntos = lazy(() =>
  import('./fondo-de-puntos').then((modulo) => ({ default: modulo.FondoDePuntos })),
)

// Lo que comparten la landing, entrar y crear cuenta: el tema y el campo de puntos. Vive en la
// raíz y no en cada pantalla para que no se remonte al pasar de una a otra.
//
// El tema es el que se eligió en la landing, papel claro si nadie eligió, sea cual sea el de
// adentro de la app. Se fuerza antes del primer pintado: en un efecto normal la pantalla asoma
// con el tema viejo durante un cuadro. Al salir, el documento vuelve a la preferencia de
// adentro.
export const MarcoPublico = ({ children }: { children: ReactNode }) => {
  const tema = temaDeEntrada.usar()
  useLayoutEffect(() => forceTheme(tema), [tema])

  return (
    <>
      <Suspense fallback={null}>
        <FondoDePuntos tema={tema} />
      </Suspense>
      {children}
    </>
  )
}
