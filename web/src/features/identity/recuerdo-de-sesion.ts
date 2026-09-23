// Si este navegador tuvo sesión la última vez que se preguntó. No autoriza nada —la cookie es
// httpOnly y la decisión la toma el servidor—: solo dice si vale la pena preguntar antes de
// pintar la landing, que existe para quien no entró nunca y no tiene por qué esperar.
export const CLAVE_DE_SESION = 't-ledger:hubo-sesion'

export const recuerdoDeSesion = {
  hubo: (): boolean => {
    try {
      return localStorage.getItem(CLAVE_DE_SESION) === '1'
    } catch {
      return false
    }
  },
  anotar: (): void => {
    try {
      localStorage.setItem(CLAVE_DE_SESION, '1')
    } catch {
      // Sin almacenamiento se pierde la comodidad, no la sesión.
    }
  },
  olvidar: (): void => {
    try {
      localStorage.removeItem(CLAVE_DE_SESION)
    } catch {
      // Ídem.
    }
  },
}
