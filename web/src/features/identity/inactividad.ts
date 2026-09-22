// Cuánto se tolera sin tocar nada antes de cerrar la sesión. Media hora: lo que dura un
// almuerzo con la pantalla abierta, que es justo el caso que esto cubre —la computadora sin
// bloquear y el libro de plata a la vista de quien pase—.
export const INACTIVIDAD_MAXIMA = 30 * 60_000

// Dos minutos de aviso antes de cerrar. Alcanzan para volver del café y decir que seguís ahí,
// y no tantos como para que el aviso se vuelva parte del paisaje.
export const AVISO_DESDE = 28 * 60_000

export type PasoDeSesion = 'seguir' | 'avisar' | 'cerrar'

// La decisión entera, sin relojes ni ventanas: recibe cuándo fue la última señal de vida y qué
// hora es, y dice qué corresponde. Vive aparte del vigilante porque una regla que se prueba
// sin navegador es una regla que se puede afirmar; adentro de un `setInterval` habría que
// esperar media hora para saber si funciona.
export const pasoDeSesion = ({
  ahora,
  ultimaActividad,
}: {
  ahora: number
  ultimaActividad: number
}): PasoDeSesion => {
  const quieto = ahora - ultimaActividad

  if (quieto >= INACTIVIDAD_MAXIMA) return 'cerrar'
  if (quieto >= AVISO_DESDE) return 'avisar'
  return 'seguir'
}

// Lo que falta para el cierre, para la cuenta regresiva del aviso. Nunca negativo: un número
// en rojo bajando de cero sería la pantalla diciendo que ya es tarde mientras sigue abierta.
export const faltaParaCerrar = ({
  ahora,
  ultimaActividad,
}: {
  ahora: number
  ultimaActividad: number
}): number => Math.max(ultimaActividad + INACTIVIDAD_MAXIMA - ahora, 0)
