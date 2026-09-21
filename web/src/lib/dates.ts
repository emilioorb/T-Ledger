// Las fechas llegan de la API como AAAA-MM-DD y se muestran sin pasar por Date:
// construir un Date con esa cadena y formatearlo en local desplaza el día.
export const formatIsoDate = (iso: string): string => {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

// Los meses se escriben acá y no con Intl: Intl necesita un Date, y construir uno desde
// AAAA-MM-DD desplaza el día según la zona horaria, que es justo lo que este módulo evita.
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export const formatLongDate = (iso: string): string => {
  const [year, month, day] = iso.split('-')
  const name = MONTHS[Number(month) - 1]
  if (!year || !day || !name) return iso
  return `${Number(day)} de ${name} de ${year}`
}

// «agosto de 2026». El de arriba, `formatIsoMonth`, da «08/2026», que sirve dentro de una
// tabla o de una etiqueta pero no dentro de una oración.
export const formatLongMonth = (iso: string): string => {
  const [year, month] = iso.split('-')
  const name = MONTHS[Number(month) - 1]
  return year && name ? `${name} de ${year}` : iso
}

export const formatIsoMonth = (iso: string): string => {
  const [year, month] = iso.split('-')
  return year && month ? `${month}/${year}` : iso
}

// El día de hoy en AAAA-MM-DD, tomado en UTC como las fechas que viajan a la API.
export const today = (): string => new Date().toISOString().slice(0, 10)

export const monthStart = (iso: string): string => `${iso.slice(0, 7)}-01`

export const monthEnd = (iso: string): string => {
  const [year, month] = iso.split('-').map(Number)
  if (!year || !month) return iso
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${iso.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`
}
