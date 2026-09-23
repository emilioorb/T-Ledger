// Si este navegador tuvo sesión la última vez que se preguntó. No autoriza nada —la cookie es
// httpOnly y la decisión la toma el servidor—: solo dice si vale la pena preguntar antes de
// pintar la landing, que existe para quien no entró nunca y no tiene por qué esperar.
const CLAVE = 't-ledger:hubo-sesion'

export const recuerdoDeSesion = {
  hubo: (): boolean => {
    try {
      return localStorage.getItem(CLAVE) === '1'
    } catch {
      return false
    }
  },
  anotar: (): void => {
    try {
      localStorage.setItem(CLAVE, '1')
    } catch {
      // Sin almacenamiento se pierde la comodidad, no la sesión.
    }
  },
  olvidar: (): void => {
    try {
      localStorage.removeItem(CLAVE)
    } catch {
      // Ídem.
    }
  },
}
