export interface Membresia {
  organizationId: string
  role: string
}

export interface Candidatos {
  // Lo que pidió la pantalla en la cabecera, si pidió algo.
  pedido: string | undefined
  // Dónde dice la sesión que está parada la persona. Lo mantiene Better Auth y lo cambia
  // `setActive` cuando alguien entra a otro libro.
  activo: string | null | undefined
  // Todas sus membresías.
  suyas: readonly Membresia[]
}

// En qué libro corre esta petición.
//
// El orden importa y es el que sigue: manda lo que pidió la pantalla, después lo que dice la
// sesión, y solo si no hay ninguna de las dos se usa el único libro que tenga.
//
// La tercera regla existía sola y alcanzaba mientras nadie pudiera tener dos libros. En
// cuanto se pudo, **toda** la API empezó a contestar 403 a quien tuviera dos: sin cabecera y
// sin mirar la sesión, no había a qué libro atribuir la petición. Medido en el navegador con
// tres libros: el perfil no cargaba ninguno.
//
// Elegir «el primero» habría sido peor que el 403: mostrar las cifras de un libro bajo el
// nombre de otro es el error que nadie reporta porque no se ve.
export const elegirLibro = ({ pedido, activo, suyas }: Candidatos): Membresia | null => {
  if (pedido) return suyas.find((membresia) => membresia.organizationId === pedido) ?? null
  if (activo) return suyas.find((membresia) => membresia.organizationId === activo) ?? null
  return suyas.length === 1 ? (suyas[0] ?? null) : null
}
