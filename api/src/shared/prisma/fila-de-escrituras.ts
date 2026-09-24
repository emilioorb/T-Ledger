// Cuántas escrituras esperan a la vez, por libro y por persona, contadas en el proceso antes de
// pedir una conexión. Quien espera el candado de un libro la ocupa mientras espera, y el pool es uno
// solo para todos: sin tope, una cuenta con decenas de escrituras en paralelo dejaba a los demás
// libros sin conexiones. Lo que no entra se rechaza sin tocar la base, y el cliente prueba de nuevo.
//
// Es del proceso: con una sola instancia alcanza. Con varias, cada una tendría su propio tope.
export class FilaDeEscrituras {
  private readonly enFila = new Map<string, number>()

  constructor(private readonly topes: { porLibro: number; porPersona: number }) {}

  // Devuelve cómo salir de la fila, o `null` si no hay lugar.
  entrar(libro: string, persona: string | undefined): (() => void) | null {
    const claves: [string, number][] = [[`libro:${libro}`, this.topes.porLibro]]
    if (persona) claves.push([`persona:${persona}`, this.topes.porPersona])
    if (claves.some(([clave, tope]) => (this.enFila.get(clave) ?? 0) >= tope)) return null

    for (const [clave] of claves) this.enFila.set(clave, (this.enFila.get(clave) ?? 0) + 1)
    let salio = false
    return () => {
      if (salio) return
      salio = true
      for (const [clave] of claves) {
        const quedan = (this.enFila.get(clave) ?? 1) - 1
        if (quedan === 0) this.enFila.delete(clave)
        else this.enFila.set(clave, quedan)
      }
    }
  }
}
