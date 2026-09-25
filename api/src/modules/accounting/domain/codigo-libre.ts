import { err, ok, type Result } from '../../../shared/kernel/result.js'

// Busca contra todos los códigos del libro y no solo contra las hijas de la madre: la clave de
// una cuenta es libro más código, así que un código tomado en cualquier rama choca igual.
export const siguienteCodigoLibre = (
  ocupados: ReadonlySet<string>,
  desde: number,
  hasta: number,
): Result<string, RangeError> => {
  for (let codigo = desde; codigo <= hasta; codigo++) {
    if (!ocupados.has(String(codigo))) return ok(String(codigo))
  }
  return err(new RangeError(`No quedan códigos libres entre ${desde} y ${hasta}.`))
}
