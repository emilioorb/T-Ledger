import { formatIsoDate } from '@/lib/dates'
import { formatMoney, type MoneyDto } from '@/lib/money'
import { copy } from './copy'

// Un monto del dominio, reconocido por su forma. No hay tipo que consultar: lo que llega del
// registro es JSON suelto, guardado como estaba cuando el cambio ocurrió.
const esMonto = (valor: object): valor is MoneyDto =>
  'minorUnits' in valor && 'currency' in valor && typeof valor.minorUnits === 'string'

// Una marca de tiempo ISO. Se reconoce por la forma y no por el nombre del campo: el rastro
// guarda fechas en `date`, `desiredDate`, `startDate` y `maturityDate`, y la lista crecería
// cada vez que alguien agregue una.
const ISO = /^\d{4}-\d{2}-\d{2}T/

// Cómo se muestra el nombre de un campo. Lo que no está traducido sale tal cual: es mejor un
// nombre técnico que un campo escondido, porque el registro existe para poder mirarlo todo.
export const nombreDeCampo = (campo: string): string => copy.audit.fields[campo] ?? campo

// Cómo se muestra un valor guardado. Sin esto el registro imprimía «currency CRC, minorUnits
// 900000000» donde tenía que decir ₡9 000 000,00 —en una aplicación de plata, mostrar
// céntimos crudos es no mostrar nada— y fechas con hora y zona donde bastaba el día.
//
// Devuelve `null` cuando no hay nada que mostrar. Quien llama decide qué hacer con eso: una
// lista vacía de aportes no es un cambio que valga una línea.
export const valorLegible = (valor: unknown, nombres?: Map<string, string>): string | null => {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no'

  if (typeof valor === 'string') {
    if (ISO.test(valor)) return formatIsoDate(valor.slice(0, 10))
    if (valor === '') return null
    // Un identificador guardado no dice nada: el rastro conserva `categoryId` porque es lo
    // que el movimiento tiene, y en pantalla eso era un renglón de treinta y seis caracteres
    // hexadecimales. Se cambia por el nombre de hoy; si la categoría ya no existe, queda el
    // identificador, que es mejor que nada.
    return nombres?.get(valor) ?? copy.audit.values[valor] ?? valor
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return null
    return valor
      .map((item) => valorLegible(item, nombres))
      .filter((texto): texto is string => texto !== null)
      .join(' · ')
  }

  if (typeof valor === 'object') {
    if (esMonto(valor)) return formatMoney(valor)
    const partes = Object.entries(valor as Record<string, unknown>)
      .map(([clave, v]) => {
        const texto = valorLegible(v, nombres)
        return texto === null ? null : `${nombreDeCampo(clave)} ${texto}`
      })
      .filter((texto): texto is string => texto !== null)
    return partes.length > 0 ? partes.join(', ') : null
  }

  return String(valor)
}
