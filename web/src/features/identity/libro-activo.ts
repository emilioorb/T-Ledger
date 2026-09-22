import { useEffect, useRef } from 'react'
import { organization, useActiveOrganization, useListOrganizations } from './auth-client'

// La sesión puede quedarse sin libro activo: entrar no elige ninguno, y quien llegó a su libro
// por una vía que no pasó por «aceptar la invitación» —la primera cuenta de la instancia, por
// ejemplo— nunca tuvo uno. El servidor lo disimula: cuando no llega la cabecera del libro,
// resuelve el único al que pertenecés y la app funciona igual.
//
// Pero el navegador no sabe *cuál* resolvió, y de ahí salen los síntomas raros: el menú no
// podía decir si eras el dueño —el rol vive en la membresía del libro activo— y por eso el
// registro de auditoría no aparecía aunque el permiso estuviera bien puesto.
//
// Así que se elige uno y se deja escrito en la sesión. Con un solo libro no hay nada que
// decidir; con varios, el primero es tan arbitrario como el que ya elige el servidor, y el día
// que haya selector será él quien mande.
export const useAsegurarLibroActivo = (): void => {
  const { data: activo, isPending: cargandoActivo } = useActiveOrganization()
  const { data: libros, isPending: cargandoLibros } = useListOrganizations()
  // Una sola vez por carga: `setActive` refresca la sesión, y sin esta guarda el efecto se
  // vuelve a disparar con el dato nuevo y entra en bucle.
  const yaElegido = useRef(false)

  useEffect(() => {
    if (yaElegido.current || cargandoActivo || cargandoLibros) return
    if (activo) return

    const primero = libros?.[0]
    if (!primero) return

    yaElegido.current = true
    void organization.setActive({ organizationId: primero.id })
  }, [activo, libros, cargandoActivo, cargandoLibros])
}
