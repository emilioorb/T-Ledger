import { lazy, Suspense, useLayoutEffect, type ReactNode } from 'react'
import { forceTheme, temaDeEntrada } from '@/lib/theme'
import { useHidratado } from '@/lib/use-hidratado'
import { llevaFondo } from './lleva-fondo'

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
  // El guardado y no `tema`: al hidratar la portada, `tema` todavía es la instantánea del
  // prerender (claro), y forzarla pintaría un cuadro claro a quien eligió oscuro.
  useLayoutEffect(() => forceTheme(temaDeEntrada.leer()), [tema])
  // El lienzo no va en el HTML de la portada: se monta cuando ya hidrató, y entra con su fundido.
  // En pantallas táctiles no se monta (ver lleva-fondo.ts).
  const conFondo = useHidratado() && llevaFondo()

  return (
    <>
      {conFondo && (
        <Suspense fallback={null}>
          <FondoDePuntos tema={tema} />
        </Suspense>
      )}
      {children}
    </>
  )
}
